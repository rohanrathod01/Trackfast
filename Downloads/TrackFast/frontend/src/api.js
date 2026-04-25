const API = 'http://localhost:8000';

export async function fetchHospitals() {
  const res = await fetch(`${API}/api/hospitals`);
  return res.json();
}

export async function fetchAmbulances() {
  const res = await fetch(`${API}/api/ambulances`);
  return res.json();
}

export async function fetchIncidents() {
  const res = await fetch(`${API}/api/incidents`);
  return res.json();
}

export async function fetchIncident(trackingId) {
  const res = await fetch(`${API}/api/incidents/${trackingId}`);
  return res.json();
}

export async function createIncident(lat, lng, label = 'Main Street', severity = 'high') {
  const res = await fetch(`${API}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, label, severity }),
  });
  return res.json();
}

export async function getNearestHospitals(lat, lng) {
  const res = await fetch(`${API}/api/nearest-hospitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });
  return res.json();
}

export async function bookBed(incidentId, hospitalId) {
  const res = await fetch(`${API}/api/book-bed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId, hospital_id: hospitalId }),
  });
  return res.json();
}

export async function cancelBooking(incidentId) {
  const res = await fetch(`${API}/api/cancel-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId }),
  });
  return res.json();
}

export async function markArrived(incidentId) {
  const res = await fetch(`${API}/api/arrive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId, status: 'arrived' }),
  });
  return res.json();
}

export async function completeIncident(incidentId) {
  const res = await fetch(`${API}/api/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId, status: 'completed' }),
  });
  return res.json();
}

export async function resetData() {
  const res = await fetch(`${API}/api/reset`, { method: 'POST' });
  return res.json();
}

export function createTrackingWs(trackingId, onMessage) {
  const ws = new WebSocket(`ws://localhost:8000/ws/track/${trackingId}`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}

export function createDispatchWs(onMessage) {
  const ws = new WebSocket(`ws://localhost:8000/ws/dispatch`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
