'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getAmbulances,
  getEmergencyRequests,
  getIntersections,
  getRideHistory,
  Ambulance,
  EmergencyRequest,
  Intersection,
  RideHistory,
} from '@/lib/storage';
import { Activity, AlertTriangle, MapPin, Truck, TrendingUp, Clock } from 'lucide-react';

interface CentralDashboardProps {
  onBack: () => void;
}

export default function CentralDashboard({ onBack }: CentralDashboardProps) {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [rideHistory, setRideHistory] = useState<RideHistory[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAmbulances(getAmbulances());
      setRequests(getEmergencyRequests());
      setIntersections(getIntersections());
      setRideHistory(getRideHistory());
    }, 500);

    setAmbulances(getAmbulances());
    setRequests(getEmergencyRequests());
    setIntersections(getIntersections());
    setRideHistory(getRideHistory());

    return () => clearInterval(timer);
  }, []);

  const activeAmbulances = ambulances.filter((a) => a.status === 'active');
  const availableAmbulances = ambulances.filter((a) => a.status === 'available');
  const waitingRequests = requests.filter((r) => r.status === 'waiting');
  const activeRequests = requests.filter((r) => r.status === 'active');
  const completedRequests = requests.filter((r) => r.status === 'completed');
  const activeAlerts = intersections.filter((i) => i.alertActive);

  const totalDistance = rideHistory.reduce((sum, ride) => sum + (ride.distance || 0), 0);
  const avgResponseTime = rideHistory.length > 0 
    ? rideHistory.reduce((sum, ride) => sum + (ride.duration || 0), 0) / rideHistory.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur p-6 rounded-xl border border-border/50">
          <div>
            <h1 className="text-5xl font-black text-foreground mb-2">System Command Center</h1>
            <p className="text-muted-foreground text-lg">Real-time monitoring and coordination of all emergency operations across the city network</p>
          </div>
          <Button
            onClick={onBack}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium px-6 whitespace-nowrap transition-all duration-200"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-border bg-gradient-to-br from-card to-card/70 border-2 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Ambulances</p>
                <p className="text-4xl font-bold text-accent mt-2">{activeAmbulances.length}</p>
              </div>
              <div className="p-2 bg-accent/20 rounded-lg">
                <Truck className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-gradient-to-br from-card to-card/70 border-2 hover:border-green-500/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Available Units</p>
                <p className="text-4xl font-bold text-green-400 mt-2">{availableAmbulances.length}</p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-gradient-to-br from-card to-card/70 border-2 hover:border-yellow-500/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending Requests</p>
                <p className="text-4xl font-bold text-yellow-400 mt-2">{waitingRequests.length}</p>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border bg-gradient-to-br from-card to-card/70 border-2 hover:border-red-500/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Alerts</p>
                <p className="text-4xl font-bold text-red-400 mt-2">{activeAlerts.length}</p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Ambulance Status */}
          <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-accent" />
              Fleet Status
            </h2>

            <div className="space-y-3">
              {ambulances.map((ambulance) => (
                <div key={ambulance.id} className={`p-3 rounded-lg border transition-all ${
                  ambulance.status === 'active'
                    ? 'bg-red-900/20 border-red-600/60'
                    : ambulance.status === 'assigned'
                    ? 'bg-blue-900/20 border-blue-600/60'
                    : 'bg-card border-border/50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        {ambulance.number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          ambulance.status === 'available'
                            ? 'bg-green-500'
                            : ambulance.status === 'active'
                            ? 'bg-red-500 animate-pulse'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded ${
                        ambulance.status === 'available'
                          ? 'bg-green-500/20 text-green-300'
                          : ambulance.status === 'active'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {ambulance.status}
                      </span>
                    </div>
                  </div>
                  {ambulance.gpsLat && ambulance.gpsLng && (
                    <p className="text-xs text-muted-foreground font-mono">
                      📍 {ambulance.gpsLat.toFixed(4)}, {ambulance.gpsLng.toFixed(4)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Emergency Requests */}
          <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Emergency Requests
            </h2>

            <div className="space-y-3">
              {/* Waiting */}
              {waitingRequests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-2">
                    WAITING ({waitingRequests.length})
                  </p>
                  {waitingRequests.slice(0, 2).map((req) => (
                    <div key={req.id} className="p-2 bg-yellow-900/20 rounded border border-yellow-700/30 text-xs mb-2">
                      <p className="font-semibold text-foreground">{req.patientName}</p>
                      <p className="text-muted-foreground">{req.pickupLocation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Active */}
              {activeRequests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-2">
                    ACTIVE ({activeRequests.length})
                  </p>
                  {activeRequests.slice(0, 2).map((req) => (
                    <div key={req.id} className="p-2 bg-green-900/20 rounded border border-green-700/30 text-xs mb-2">
                      <p className="font-semibold text-foreground">{req.patientName}</p>
                      <p className="text-muted-foreground">Amb: {req.ambulanceId}</p>
                    </div>
                  ))}
                </div>
              )}

              {waitingRequests.length === 0 && activeRequests.length === 0 && (
                <p className="text-muted-foreground text-sm">No active requests</p>
              )}
            </div>
          </Card>

          {/* Statistics */}
          <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Performance Metrics
            </h2>

            <div className="space-y-3">
              <div className="bg-card border border-border/50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Requests</p>
                <p className="text-3xl font-bold text-foreground mt-1">{requests.length}</p>
              </div>

              <div className="bg-card border border-border/50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{completedRequests.length}</p>
              </div>

              <div className="bg-card border border-border/50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Response Time</p>
                <p className="text-3xl font-bold text-accent mt-1">
                  {(avgResponseTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Intersections */}
        <Card className="p-6 border-border bg-card/50 backdrop-blur border-2 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            Smart Traffic Intersections
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {intersections.map((intersection) => (
              <div
                key={intersection.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  intersection.alertActive
                    ? 'bg-red-900/20 border-red-600/60 shadow-lg shadow-red-500/10'
                    : 'bg-card border-border/50 hover:border-border'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-foreground text-sm">{intersection.name}</h3>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      intersection.alertActive
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {intersection.alertActive ? 'ACTIVE' : 'NORMAL'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  📍 {intersection.position.lat.toFixed(4)}, {intersection.position.lng.toFixed(4)}
                </p>
                <p className="text-xs">
                  Mode: <span className={intersection.trafficMode === 'emergency' ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{intersection.trafficMode === 'emergency' ? '🚨 Emergency' : '✓ Normal'}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Ride History */}
        <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Completed Rides
          </h2>

          {rideHistory.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No completed rides yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Request</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ambulance</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rideHistory.slice(0, 6).map((ride) => (
                    <tr key={ride.id} className="border-b border-border/30 hover:bg-card/50 transition-colors">
                      <td className="py-3 px-3 text-foreground font-mono text-xs">
                        {ride.requestId.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-3 text-foreground font-medium">{ride.ambulanceId}</td>
                      <td className="py-3 px-3 text-foreground">
                        {ride.duration ? (ride.duration / 1000).toFixed(1) : '-'}s
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-600/20 text-green-300 border border-green-600/50">
                          ✓ {ride.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* System Health Footer */}
        <div className="mt-8 bg-gradient-to-r from-green-900/20 to-green-800/10 border border-green-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-300">System Status: Operational</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Last Updated: {new Date().toLocaleTimeString()} | Active Calls: {requests.length} | Available Units: {availableAmbulances.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
