import os
import math
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///emergency.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ------------------------- Database Models -------------------------
class Hospital(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    total_beds = db.Column(db.Integer, default=50)
    available_beds = db.Column(db.Integer, default=50)

class Ambulance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    current_lat = db.Column(db.Float, nullable=False)
    current_lng = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='available')  # available, dispatched, on_route

class EmergencyRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_lat = db.Column(db.Float, nullable=False)
    patient_lng = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default='pending')
    assigned_ambulance_id = db.Column(db.Integer, db.ForeignKey('ambulance.id'), nullable=True)
    hospital_booked_id = db.Column(db.Integer, db.ForeignKey('hospital.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BedBooking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    emergency_request_id = db.Column(db.Integer, db.ForeignKey('emergency_request.id'))
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospital.id'))
    booked_at = db.Column(db.DateTime, default=datetime.utcnow)

# ------------------------- Helper Functions -------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_nearest_ambulance(patient_lat, patient_lng):
    available_ambulances = Ambulance.query.filter_by(status='available').all()
    if not available_ambulances:
        return None
    nearest = min(available_ambulances, key=lambda amb: haversine(patient_lat, patient_lng, amb.current_lat, amb.current_lng))
    return nearest

# ------------------------- Routes -------------------------
@app.route('/')
def patient_page():
    return render_template('patient.html')

@app.route('/driver')
def driver_page():
    return render_template('driver.html')

@app.route('/driver/hospitals')
def driver_hospitals():
    return render_template('driver_hospitals.html')

@app.route('/api/sos', methods=['POST'])
def sos():
    data = request.json
    patient_lat = data['lat']
    patient_lng = data['lng']
    
    nearest_amb = get_nearest_ambulance(patient_lat, patient_lng)
    if not nearest_amb:
        return jsonify({'error': 'No ambulances available'}), 503
    
    emergency = EmergencyRequest(
        patient_lat=patient_lat,
        patient_lng=patient_lng,
        status='ambulance_assigned',
        assigned_ambulance_id=nearest_amb.id
    )
    db.session.add(emergency)
    db.session.commit()
    
    nearest_amb.status = 'dispatched'
    db.session.commit()
    
    return jsonify({
        'request_id': emergency.id,
        'ambulance_id': nearest_amb.id,
        'ambulance_name': nearest_amb.name,
        'ambulance_lat': nearest_amb.current_lat,
        'ambulance_lng': nearest_amb.current_lng,
        'message': f'Ambulance {nearest_amb.name} dispatched'
    })

@app.route('/api/ambulance/<int:ambulance_id>/active_request', methods=['GET'])
def get_active_request(ambulance_id):
    active_req = EmergencyRequest.query.filter_by(
        assigned_ambulance_id=ambulance_id
    ).filter(EmergencyRequest.status.in_(['ambulance_assigned', 'hospital_booked'])).first()
    
    if not active_req:
        return jsonify({'active': False})
    
    hospital = None
    if active_req.hospital_booked_id:
        hospital = Hospital.query.get(active_req.hospital_booked_id)
    
    return jsonify({
        'active': True,
        'request_id': active_req.id,
        'patient_lat': active_req.patient_lat,
        'patient_lng': active_req.patient_lng,
        'status': active_req.status,
        'hospital_booked': {
            'id': hospital.id,
            'name': hospital.name,
            'lat': hospital.lat,
            'lng': hospital.lng
        } if hospital else None
    })

@app.route('/api/hospitals', methods=['GET'])
def get_hospitals():
    hospitals = Hospital.query.all()
    return jsonify([{
        'id': h.id,
        'name': h.name,
        'lat': h.lat,
        'lng': h.lng,
        'available_beds': h.available_beds,
        'total_beds': h.total_beds
    } for h in hospitals])

@app.route('/api/book_bed', methods=['POST'])
def book_bed():
    data = request.json
    request_id = data['request_id']
    hospital_id = data['hospital_id']
    
    emergency = EmergencyRequest.query.get(request_id)
    if not emergency:
        return jsonify({'error': 'Invalid request'}), 404
    
    if emergency.status != 'ambulance_assigned':
        return jsonify({'error': 'Bed already booked or request invalid'}), 400
    
    hospital = Hospital.query.get(hospital_id)
    if not hospital or hospital.available_beds <= 0:
        return jsonify({'error': 'No beds available at this hospital'}), 400
    
    hospital.available_beds -= 1
    emergency.status = 'hospital_booked'
    emergency.hospital_booked_id = hospital_id
    
    booking = BedBooking(emergency_request_id=request_id, hospital_id=hospital_id)
    db.session.add(booking)
    db.session.commit()
    
    if emergency.assigned_ambulance_id:
        ambulance = Ambulance.query.get(emergency.assigned_ambulance_id)
        ambulance.status = 'on_route'
        db.session.commit()
    
    return jsonify({'success': True, 'message': f'Bed booked at {hospital.name}'})

@app.route('/api/ambulance_location/<int:ambulance_id>', methods=['GET'])
def get_ambulance_location(ambulance_id):
    amb = Ambulance.query.get(ambulance_id)
    if amb:
        return jsonify({'lat': amb.current_lat, 'lng': amb.current_lng})
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/active_patient_location/<int:ambulance_id>', methods=['GET'])
def get_active_patient_location(ambulance_id):
    active = EmergencyRequest.query.filter_by(
        assigned_ambulance_id=ambulance_id
    ).filter(EmergencyRequest.status.in_(['ambulance_assigned', 'hospital_booked'])).first()
    if active:
        return jsonify({'patient_lat': active.patient_lat, 'patient_lng': active.patient_lng})
    return jsonify({'error': 'No active request'}), 404

@app.route('/api/chat', methods=['POST'])
def chat():
    user_msg = request.json.get('message', '').lower()
    
    if 'bleed' in user_msg or 'blood' in user_msg:
        response = "🩸 Apply direct pressure with a clean cloth. Elevate the wound if possible."
    elif 'heart' in user_msg or 'chest pain' in user_msg:
        response = "❤️ Call emergency immediately. Have the person sit down, loosen tight clothing."
    elif 'breath' in user_msg or 'choking' in user_msg:
        response = "🌬️ Perform Heimlich maneuver: Stand behind, arms around waist, fist above navel, thrust inward."
    elif 'unconscious' in user_msg or 'faint' in user_msg:
        response = "🆘 Check responsiveness, open airway, check breathing. If not breathing, start CPR."
    elif 'fracture' in user_msg or 'broken' in user_msg:
        response = "🦴 Immobilize the limb, apply ice pack (wrapped in cloth), don't try to realign bones."
    elif 'burn' in user_msg:
        response = "🔥 Cool the burn under running water for 10-15 mins. Cover with sterile gauze."
    elif 'seizure' in user_msg:
        response = "⚡ Clear area, cushion head, turn person on side. Don't restrain or put anything in mouth."
    else:
        response = "🚑 Stay calm. Check ABC (Airway, Breathing, Circulation). Call emergency if condition worsens."
    
    return jsonify({'response': response})

# ------------------------- Database Seeding (7 hospitals) -------------------------
def init_db():
    with app.app_context():
        db.drop_all()
        db.create_all()
        
        hospitals = [
            Hospital(name="Apollo Hospital", lat=12.9716, lng=77.5946, total_beds=200, available_beds=45),
            Hospital(name="Fortis Hospital", lat=12.9352, lng=77.6245, total_beds=150, available_beds=12),
            Hospital(name="Manipal Hospital", lat=12.9918, lng=77.5909, total_beds=300, available_beds=78),
            Hospital(name="Narayana Health", lat=12.9698, lng=77.5949, total_beds=250, available_beds=5),
            Hospital(name="Columbia Asia", lat=12.9279, lng=77.6271, total_beds=120, available_beds=32),
            Hospital(name="Sakra World Hospital", lat=12.9345, lng=77.6053, total_beds=180, available_beds=61),
            Hospital(name="Aster CMI Hospital", lat=13.0285, lng=77.6007, total_beds=220, available_beds=44)
        ]
        db.session.add_all(hospitals)
        
        ambulances = [
            Ambulance(name="AMB-001", current_lat=12.975, current_lng=77.580, status="available"),
            Ambulance(name="AMB-002", current_lat=12.950, current_lng=77.600, status="available"),
            Ambulance(name="AMB-003", current_lat=12.990, current_lng=77.610, status="available")
        ]
        db.session.add_all(ambulances)
        db.session.commit()
        print("Database initialized with 7 hospitals and 3 ambulances.")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)