import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import * as api from '../api'

const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="width:40px;height:40px;background:#22c55e;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 20px rgba(34,197,94,0.6)">🚑</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20],
})

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="width:40px;height:40px;background:#a855f7;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 20px rgba(168,85,247,0.6)">🏥</div>`,
  iconSize: [40, 40], iconAnchor: [20, 20],
})

function MapFollower({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.panTo(position, { animate: true, duration: 1 })
  }, [position, map])
  return null
}

const TIMELINE_STEPS = [
  { key: 'reported', label: 'Call Received', icon: '📞' },
  { key: 'dispatched', label: 'Dispatched', icon: '🚨' },
  { key: 'en_route', label: 'En Route', icon: '🚑' },
  { key: 'arrived', label: 'Arrived', icon: '🏥' },
]

function getStepIndex(status) {
  const map = { reported: 0, dispatched: 1, en_route: 2, arrived: 3, completed: 3 }
  return map[status] ?? 0
}

export default function TrackingPage() {
  const { trackingId } = useParams()
  const [incident, setIncident] = useState(null)
  const [ambPos, setAmbPos] = useState(null)
  const [destPos, setDestPos] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(0)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('dispatched')
  const [loading, setLoading] = useState(true)
  const wsRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')

    // Fetch incident data
    api.fetchIncident(trackingId).then(data => {
      setIncident(data)
      if (data.amb_lat) setAmbPos([data.amb_lat, data.amb_lng])
      if (data.hosp_lat) setDestPos([data.hosp_lat, data.hosp_lng])
      setStatus(data.status)
      setLoading(false)
    }).catch(() => setLoading(false))

    // Connect WebSocket
    const ws = api.createTrackingWs(trackingId, (data) => {
      if (data.type === 'location_update') {
        setAmbPos([data.lat, data.lng])
        setDestPos([data.dest_lat, data.dest_lng])
        setEtaSeconds(data.eta_seconds)
        setProgress(data.progress)
        setStatus(data.status)
      }
    })
    wsRef.current = ws
    return () => ws.close()
  }, [trackingId])

  const formatEta = (sec) => {
    if (sec <= 0) return 'Arrived'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m > 0 ? m + 'm ' : ''}${s}s`
  }

  const currentStep = getStepIndex(status)

  if (loading) {
    return (
      <div className="tracking-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚑</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Loading tracking data...</div>
        </div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="tracking-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Incident not found</div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Tracking ID: {trackingId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tracking-layout">
      {/* Header */}
      <div className="tracking-header">
        <div className="logo">
          <div className="logo-icon">🚨</div>
          <div className="logo-text">Track<span>Fast</span></div>
        </div>
        <span className={`badge ${status === 'arrived' || status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
          {status === 'arrived' || status === 'completed' ? '✓ ARRIVED' : '● LIVE TRACKING'}
        </span>
      </div>

      {/* Map */}
      <div className="tracking-map">
        <MapContainer
          center={ambPos || [40.7128, -74.0060]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {ambPos && (
            <>
              <Marker position={ambPos} icon={ambulanceIcon} />
              <MapFollower position={ambPos} />
            </>
          )}
          {destPos && <Marker position={destPos} icon={hospitalIcon} />}
          {ambPos && destPos && (
            <Polyline
              positions={[ambPos, destPos]}
              pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '10 6', opacity: 0.7 }}
            />
          )}
        </MapContainer>

        {/* Overlay panel */}
        <div className="tracking-panel">
          <div className="tracking-card">
            {/* ETA */}
            <div className="eta-display">
              <div className="eta-value">
                {status === 'arrived' || status === 'completed' ? '✅' : formatEta(etaSeconds)}
              </div>
              <div className="eta-label">
                {status === 'arrived' || status === 'completed'
                  ? 'Ambulance has arrived at the hospital'
                  : 'Estimated Time of Arrival'}
              </div>
            </div>

            {/* Progress */}
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
            </div>

            {/* Hospital info */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0', padding: '12px', background: 'var(--bg-primary)', borderRadius: 10 }}>
              <div style={{ fontSize: 28 }}>🏥</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{incident.hospital_name || 'Pending Assignment'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {incident.hospital_address || 'Hospital address'}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="timeline">
              {TIMELINE_STEPS.map((s, i) => (
                <div key={s.key} style={{ display: 'contents' }}>
                  <div className="timeline-step">
                    <div className={`timeline-dot ${i < currentStep ? 'active' : i === currentStep ? 'current' : ''}`}>
                      {s.icon}
                    </div>
                    <div className="timeline-label">{s.label}</div>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`timeline-line ${i < currentStep ? 'active' : ''}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Ambulance info */}
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Ambulance {incident.ambulance_call_sign} • Incident {incident.tracking_id}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
