import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as api from './api'

// Custom icons
const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#22c55e;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px rgba(34,197,94,0.5)">🚑</div>`,
  iconSize: [32, 32], iconAnchor: [16, 16],
})

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;background:#a855f7;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 12px rgba(168,85,247,0.5)">🏥</div>`,
  iconSize: [32, 32], iconAnchor: [16, 16],
})

const incidentIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#ef4444;border-radius:50%;border:3px solid #fff;box-shadow:0 0 20px rgba(239,68,68,0.6);animation:pulse-ring 1.5s ease-out infinite"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
})

const INCIDENT_POS = [40.7130, -74.0070]
const CENTER = [40.7120, -74.0060]

function MapUpdater({ ambulancePos }) {
  return null // Keep map centered
}

export default function App() {
  const [theme, setTheme] = useState('dark')
  const [hospitals, setHospitals] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [incident, setIncident] = useState(null)
  const [nearestHospitals, setNearestHospitals] = useState([])
  const [bookingResult, setBookingResult] = useState(null)
  const [ambPos, setAmbPos] = useState(null)
  const [simStatus, setSimStatus] = useState('idle') // idle | dispatched | en_route | arrived
  const wsRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const loadData = useCallback(async () => {
    const [h, a] = await Promise.all([api.fetchHospitals(), api.fetchAmbulances()])
    setHospitals(h)
    setAmbulances(a)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSimulateEmergency = async () => {
    const inc = await api.createIncident(INCIDENT_POS[0], INCIDENT_POS[1], 'Main Street', 'high')
    setIncident(inc)
    setSimStatus('dispatched')
    const nearest = await api.getNearestHospitals(INCIDENT_POS[0], INCIDENT_POS[1])
    setNearestHospitals(nearest)
    await loadData()
  }

  const handleBookBed = async (hospitalId) => {
    if (!incident) return
    const result = await api.bookBed(incident.id, hospitalId)
    setBookingResult(result)
    setSimStatus('en_route')
    await loadData()
    // Start WebSocket tracking
    if (wsRef.current) wsRef.current.close()
    const ws = api.createTrackingWs(result.tracking_id, (data) => {
      if (data.type === 'location_update') {
        setAmbPos([data.lat, data.lng])
        if (data.status === 'arrived') setSimStatus('arrived')
      }
    })
    wsRef.current = ws
  }

  const handleArrived = async () => {
    if (!incident) return
    const result = await api.markArrived(incident.id)
    setSimStatus('arrived')
    setBookingResult(prev => ({ ...prev, response_time: result.response_time_display }))
    await loadData()
  }

  const handleReset = async () => {
    if (wsRef.current) wsRef.current.close()
    await api.resetData()
    setIncident(null)
    setNearestHospitals([])
    setBookingResult(null)
    setAmbPos(null)
    setSimStatus('idle')
    await loadData()
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="header">
          <div className="logo">
            <div className="logo-icon">🚨</div>
            <div className="logo-text">Track<span>Fast</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/driver" className="btn btn-outline" style={{ fontSize: 12, padding: '8px 12px' }}>
              🚑 Driver View
            </a>
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="section">
          <div className="section-title">System Overview</div>
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
                {ambulances.filter(a => a.status === 'available').length}
              </div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
                {ambulances.filter(a => a.status !== 'available').length}
              </div>
              <div className="stat-label">Active</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
                {hospitals.length}
              </div>
              <div className="stat-label">Hospitals</div>
            </div>
            <div className="stat-box">
              <div className="stat-value" style={{ color: 'var(--accent-yellow)' }}>
                {hospitals.reduce((s, h) => s + h.icu_beds, 0)}
              </div>
              <div className="stat-label">ICU Beds</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="section">
          <div className="section-title">Emergency Simulation</div>
          {simStatus === 'idle' && (
            <button className="btn btn-red btn-full" onClick={handleSimulateEmergency}>
              🚨 Simulate Emergency at Main Street
            </button>
          )}
          {simStatus !== 'idle' && (
            <button className="btn btn-outline btn-full" onClick={handleReset}>
              🔄 Reset Simulation
            </button>
          )}
        </div>

        {/* Incident Info */}
        {incident && (
          <div className="section">
            <div className="section-title">Active Incident</div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">📍 {incident.location_label || 'Main Street'}</div>
                  <div className="card-subtitle">ID: {incident.tracking_id}</div>
                </div>
                <span className={`badge ${simStatus === 'en_route' ? 'badge-blue' : simStatus === 'arrived' ? 'badge-green' : 'badge-red'}`}>
                  {simStatus === 'idle' ? 'IDLE' : simStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="meta-row" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>🚑 {incident.ambulance_call_sign}</span>
                <span>⚠️ Severity: HIGH</span>
              </div>
            </div>
          </div>
        )}

        {/* Hospital Selection (before booking) */}
        {nearestHospitals.length > 0 && !bookingResult && (
          <div className="section">
            <div className="section-title">Nearest Hospitals</div>
            {nearestHospitals.map(h => (
              <div key={h.id} className="card hospital-card">
                <div className="card-header">
                  <div>
                    <div className="card-title">🏥 {h.name}</div>
                    <div className="card-subtitle">{h.address}</div>
                  </div>
                  <span className={`badge ${h.available ? 'badge-green' : 'badge-red'}`}>
                    {h.available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                  </span>
                </div>
                <div className="beds-row">
                  <div className="bed-info">
                    <span>ICU:</span>
                    <span className={`bed-count ${h.icu_beds > 2 ? 'green' : h.icu_beds > 0 ? 'yellow' : 'red'}`}>
                      {h.icu_beds}
                    </span>
                  </div>
                  <div className="bed-info">
                    <span>General:</span>
                    <span className="bed-count green">{h.general_beds}</span>
                  </div>
                </div>
                <div className="meta-row">
                  <span>📏 {h.distance_km} km</span>
                  <span>⏱️ ETA: {h.eta_minutes} min</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  {h.available ? (
                    <button className="btn btn-green btn-full" onClick={() => handleBookBed(h.id)}>
                      ✓ SELECT THIS HOSPITAL
                    </button>
                  ) : (
                    <button className="btn btn-outline btn-full btn-disabled">NOT AVAILABLE</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Confirmation */}
        {bookingResult && (
          <div className="section">
            <div className="section-title">Reservation Confirmed</div>
            <div className="card" style={{ borderColor: 'var(--accent-green)', borderWidth: 2 }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Bed {bookingResult.bed_label} Reserved</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                  at {bookingResult.hospital_name}
                </div>
              </div>
              <div className="stats-row">
                <div className="stat-box">
                  <div className="stat-value" style={{ color: 'var(--accent-blue)', fontSize: 16 }}>
                    {bookingResult.distance_km} km
                  </div>
                  <div className="stat-label">Distance</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: 'var(--accent-green)', fontSize: 16 }}>
                    {bookingResult.eta_minutes} min
                  </div>
                  <div className="stat-label">ETA</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value" style={{ color: 'var(--accent-yellow)', fontSize: 16 }}>
                    {bookingResult.icu_beds_remaining}
                  </div>
                  <div className="stat-label">Beds Left</div>
                </div>
              </div>
              <div className="sms-link-box">
                <div className="label">📱 Family Tracking Link (SMS)</div>
                <a href={bookingResult.tracking_url} target="_blank" rel="noopener noreferrer">
                  {bookingResult.tracking_url}
                </a>
              </div>
              {simStatus === 'en_route' && (
                <button className="btn btn-blue btn-full" style={{ marginTop: 16 }} onClick={handleArrived}>
                  🏥 Mark as Arrived at Hospital
                </button>
              )}
              {simStatus === 'arrived' && bookingResult.response_time && (
                <div className="card summary-card" style={{ marginTop: 16, background: 'var(--bg-primary)' }}>
                  <div className="check-icon">✅</div>
                  <h2>Arrived at Hospital</h2>
                  <p>Response time: {bookingResult.response_time}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer center={CENTER} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {/* Hospitals */}
          {hospitals.map(h => (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={hospitalIcon}>
              <Popup>
                <strong>{h.name}</strong><br />
                ICU: {h.icu_beds} | General: {h.general_beds}
              </Popup>
            </Marker>
          ))}
          {/* Ambulances (initial positions) */}
          {ambulances.map(a => (
            <Marker key={a.id} position={[a.lat, a.lng]} icon={ambulanceIcon}>
              <Popup>{a.call_sign} - {a.status}</Popup>
            </Marker>
          ))}
          {/* Incident */}
          {incident && (
            <CircleMarker center={INCIDENT_POS} radius={12}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6, weight: 3 }}>
              <Popup>🚨 Emergency at {incident.location_label}</Popup>
            </CircleMarker>
          )}
          {/* Moving ambulance */}
          {ambPos && (
            <Marker position={ambPos} icon={ambulanceIcon}>
              <Popup>🚑 En Route</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  )
}
