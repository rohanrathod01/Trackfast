import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import * as api from '../api'

const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#22c55e;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 16px rgba(34,197,94,0.6)">🚑</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18],
})

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="width:36px;height:36px;background:#a855f7;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 16px rgba(168,85,247,0.5)">🏥</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18],
})

const INCIDENT_POS = [40.7130, -74.0070]

export default function DriverView() {
  const [theme, setTheme] = useState('dark')
  const [step, setStep] = useState('idle') // idle | patient_loaded | select_hospital | booked | en_route | arrived | completed
  const [incident, setIncident] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [booking, setBooking] = useState(null)
  const [ambPos, setAmbPos] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [progress, setProgress] = useState(0)
  const wsRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleStartEmergency = async () => {
    const inc = await api.createIncident(INCIDENT_POS[0], INCIDENT_POS[1], 'Main Street', 'high')
    setIncident(inc)
    setStep('patient_loaded')
  }

  const handlePatientLoaded = async () => {
    const nearest = await api.getNearestHospitals(INCIDENT_POS[0], INCIDENT_POS[1])
    setHospitals(nearest)
    setStep('select_hospital')
  }

  const handleSelectHospital = async (hospitalId) => {
    const result = await api.bookBed(incident.id, hospitalId)
    setBooking(result)
    setStep('en_route')
    // Connect WebSocket
    if (wsRef.current) wsRef.current.close()
    const ws = api.createTrackingWs(result.tracking_id, (data) => {
      if (data.type === 'location_update') {
        setAmbPos([data.lat, data.lng])
        setEtaSeconds(data.eta_seconds)
        setProgress(data.progress)
        if (data.status === 'arrived') setStep('arrived')
      }
    })
    wsRef.current = ws
  }

  const handleArrived = async () => {
    const result = await api.markArrived(incident.id)
    setBooking(prev => ({ ...prev, response_time: result.response_time_display }))
    setStep('arrived')
  }

  const handleComplete = async () => {
    await api.completeIncident(incident.id)
    setStep('completed')
  }

  const handleReset = async () => {
    if (wsRef.current) wsRef.current.close()
    await api.resetData()
    setStep('idle')
    setIncident(null)
    setHospitals([])
    setBooking(null)
    setAmbPos(null)
    setEtaSeconds(0)
    setProgress(0)
  }

  const formatEta = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <div className="driver-layout">
      <div className="driver-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 600, margin: '0 auto' }}>
          <div>
            <h1>🚑 Driver Tablet</h1>
            <p>Ambulance Coordination Interface</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/" className="btn btn-outline" style={{ fontSize: 12, padding: '8px 12px' }}>📊 Dispatch</a>
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      <div className="driver-grid">
        {/* IDLE: Start Emergency */}
        {step === 'idle' && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚨</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Ready for Dispatch</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
              Press the button below to simulate an emergency call
            </p>
            <button className="btn btn-red btn-full" style={{ padding: '16px 24px', fontSize: 16 }} onClick={handleStartEmergency}>
              🚨 Simulate Emergency Call
            </button>
          </div>
        )}

        {/* PATIENT LOADED */}
        {step === 'patient_loaded' && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Emergency Dispatched</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
              Ambulance {incident?.ambulance_call_sign} assigned
            </p>
            <div className="card" style={{ margin: '16px 0', background: 'var(--bg-primary)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Incident ID</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-blue)' }}>{incident?.tracking_id}</div>
            </div>
            <button className="btn btn-green btn-full" style={{ padding: '16px 24px', fontSize: 15 }} onClick={handlePatientLoaded}>
              ✅ Patient Loaded — Select Hospital
            </button>
          </div>
        )}

        {/* HOSPITAL SELECTION */}
        {step === 'select_hospital' && (
          <>
            <div className="section-title" style={{ paddingLeft: 4 }}>Select Destination Hospital</div>
            {hospitals.map(h => (
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
                    <span>ICU Beds:</span>
                    <span className={`bed-count ${h.icu_beds > 2 ? 'green' : h.icu_beds > 0 ? 'yellow' : 'red'}`}>
                      {h.icu_beds}
                    </span>
                  </div>
                  <div className="bed-info">
                    <span>General:</span>
                    <span className="bed-count green">{h.general_beds}</span>
                  </div>
                </div>
                <div className="meta-row" style={{ marginBottom: 12 }}>
                  <span>📏 {h.distance_km} km away</span>
                  <span>⏱️ ETA: {h.eta_minutes} min</span>
                </div>
                {h.available ? (
                  <button className="btn btn-green btn-full" onClick={() => handleSelectHospital(h.id)}>
                    ✓ SELECT
                  </button>
                ) : (
                  <button className="btn btn-outline btn-full btn-disabled">NOT AVAILABLE</button>
                )}
              </div>
            ))}
          </>
        )}

        {/* EN ROUTE / NAVIGATION */}
        {(step === 'en_route' || step === 'arrived') && booking && (
          <>
            {/* Confirmation */}
            <div className="card" style={{ borderColor: 'var(--accent-green)', borderWidth: 2, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Bed {booking.bed_label} Reserved</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                for your patient at {booking.hospital_name}
              </div>
            </div>

            {/* Map */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: 250, borderRadius: 'var(--radius)' }}>
              <MapContainer
                center={ambPos || INCIDENT_POS}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                {ambPos && <Marker position={ambPos} icon={ambulanceIcon} />}
                <CircleMarker center={INCIDENT_POS} radius={8}
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.5 }} />
              </MapContainer>
            </div>

            {/* ETA & Progress */}
            <div className="card">
              <div className="eta-display">
                <div className="eta-value">{formatEta(etaSeconds)}</div>
                <div className="eta-label">{step === 'arrived' ? 'Arrived' : 'Estimated Time of Arrival'}</div>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Incident</span>
                <span>{booking.hospital_name}</span>
              </div>
            </div>

            {/* SMS Link */}
            <div className="sms-link-box">
              <div className="label">📱 Family Tracking Link (Share via SMS)</div>
              <a href={booking.tracking_url} target="_blank" rel="noopener noreferrer">
                {booking.tracking_url}
              </a>
            </div>

            {/* Action buttons */}
            {step === 'en_route' && (
              <button className="btn btn-blue btn-full" style={{ padding: '16px', fontSize: 15 }} onClick={handleArrived}>
                🏥 Arrived at Hospital
              </button>
            )}
            {step === 'arrived' && (
              <div className="card summary-card">
                <div className="check-icon">✅</div>
                <h2>Arrived at Hospital</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Response time: {booking.response_time || 'Calculating...'}
                </p>
                <button className="btn btn-green btn-full" style={{ marginTop: 12 }} onClick={handleComplete}>
                  ✓ Complete Incident
                </button>
              </div>
            )}
          </>
        )}

        {/* COMPLETED */}
        {step === 'completed' && (
          <div className="card summary-card" style={{ padding: 40 }}>
            <div className="check-icon">🎉</div>
            <h2>Incident Completed</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Patient successfully delivered to {booking?.hospital_name}.<br />
              Response time: {booking?.response_time}
            </p>
            <button className="btn btn-outline btn-full" style={{ marginTop: 20 }} onClick={handleReset}>
              🔄 Reset for Next Call
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
