AI-Enabled Smart Emergency Response & Ambulance Coordination System
===================================================================

How to Run:
-----------
1. Install Python 3.8+ and pip.
2. Install dependencies: pip install -r requirements.txt
3. Get a Google Maps API Key from Google Cloud Console.
   - Enable Maps JavaScript API, Directions API, Places API.
4. Replace YOUR_GOOGLE_MAPS_API_KEY in templates/patient.html and templates/driver.html with your actual key.
5. Run the application: python app.py
6. Open browser:
   - Patient portal: http://localhost:5000/
   - Driver dashboard: http://localhost:5000/driver

Functionality:
--------------
- Patient: Clicks SOS -> shares location -> nearest ambulance dispatched.
- AI Chatbot provides first-aid instructions.
- Driver: Sees active request, patient location on map, and hospitals with real-time bed availability.
- Driver books a bed -> hospital bed count decreases -> ambulance navigates with traffic-aware routing.

Database:
---------
SQLite file emergency.db is created automatically with sample hospitals and ambulances.
All emergency requests and bed bookings are stored.

Technology Stack:
-----------------
Backend: Flask, SQLAlchemy, SQLite
Frontend: HTML5, CSS3, JavaScript, Google Maps API
AI: Rule-based first-aid chatbot

Notes:
------
- Coordinates are set for Bangalore, India (modify in init_db() for your region).
- In production, replace the rule-based chatbot with a real LLM API.
- For real-time ambulance tracking, integrate WebSockets.