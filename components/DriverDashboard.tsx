'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAmbulances,
  getEmergencyRequests,
  getSelectedAmbulance,
  setSelectedAmbulance,
  setUserRole,
  updateAmbulance,
  updateEmergencyRequest,
  getAmbulance,
  getEmergencyRequest,
  addRideHistory,
  updateIntersection,
  getIntersections,
  Ambulance,
  EmergencyRequest,
} from '@/lib/storage';
import { MapPin, Truck, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import RouteMap from './RouteMap';
import TrafficControl from './TrafficControl';

interface DriverDashboardProps {
  onViewCentral: () => void;
  onLogout: () => void;
}

export default function DriverDashboard({ onViewCentral, onLogout }: DriverDashboardProps) {
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [activeRide, setActiveRide] = useState<EmergencyRequest | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);

  const selectedAmbulance = ambulances.find((amb) => amb.id === selectedAmbulanceId);

  // Restore saved ambulance on mount only
  useEffect(() => {
    const saved = getSelectedAmbulance();
    if (saved) {
      setSelectedAmbulanceId(saved);
    }
  }, []);

  // Polling effect — restarts whenever selectedAmbulanceId changes
  useEffect(() => {
    const tick = () => {
      setAmbulances(getAmbulances());
      setRequests(getEmergencyRequests().filter((r) => r.status !== 'completed'));

      if (selectedAmbulanceId) {
        const amb = getAmbulance(selectedAmbulanceId);
        if (amb?.currentRideId) {
          const ride = getEmergencyRequest(amb.currentRideId);
          setActiveRide(ride ?? null);
        } else {
          setActiveRide(null);
        }
      }
    };

    tick(); // run immediately so UI is fresh
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [selectedAmbulanceId]);

  const handleAmbulanceSelect = (id: string) => {
    setSelectedAmbulanceId(id);
    setSelectedAmbulance(id);
  };

  const handleAcceptRide = (requestId: string) => {
    if (!selectedAmbulanceId) return;

    updateAmbulance(selectedAmbulanceId, {
      status: 'assigned',
      currentRideId: requestId,
      gpsLat: 19.076,
      gpsLng: 72.8479,
    });

    updateEmergencyRequest(requestId, {
      status: 'assigned',
      ambulanceId: selectedAmbulanceId,
    });

    // Set activeRide immediately without waiting for next poll
    const updatedRide = getEmergencyRequest(requestId);
    setActiveRide(updatedRide ?? null);

    setAmbulances(getAmbulances());
    setRequests(getEmergencyRequests().filter((r) => r.status !== 'completed'));
  };

  const handleStartRide = () => {
    if (!activeRide || !selectedAmbulanceId) return;

    updateEmergencyRequest(activeRide.id, {
      status: 'active',
      gpsCoordinates: { lat: 19.076, lng: 72.8479 },
    });

    updateAmbulance(selectedAmbulanceId, {
      status: 'active',
    });

    // Activate first intersection alert
    const intersections = getIntersections();
    if (intersections.length > 0) {
      updateIntersection(intersections[0].id, {
        alertActive: true,
        trafficMode: 'emergency',
      });
    }

    setShowRoute(true);
    setRouteProgress(0);
  };

  const handleCompleteRide = () => {
    if (!activeRide || !selectedAmbulanceId) return;

    const startTime = activeRide.requestedAt;
    const duration = Date.now() - startTime;

    updateEmergencyRequest(activeRide.id, {
      status: 'completed',
    });

    updateAmbulance(selectedAmbulanceId, {
      status: 'available',
      currentRideId: undefined,
    });

    addRideHistory({
      id: `hist_${Date.now()}`,
      requestId: activeRide.id,
      ambulanceId: selectedAmbulanceId,
      startTime: startTime,
      endTime: Date.now(),
      duration: duration,
      status: 'completed',
    });

    // Reset intersections
    getIntersections().forEach((intersection) => {
      updateIntersection(intersection.id, {
        alertActive: false,
        trafficMode: 'normal',
      });
    });

    setShowRoute(false);
    setRouteProgress(0);
    setActiveRide(null);
    setAmbulances(getAmbulances());
    setRequests(getEmergencyRequests().filter((r) => r.status !== 'completed'));
  };

  const handleLogout = () => {
    setUserRole(null);
    onLogout();
  };

  const currentAmbulance = selectedAmbulanceId ? getAmbulance(selectedAmbulanceId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-5xl font-bold text-foreground mb-2">Driver Operations</h1>
            <p className="text-muted-foreground text-lg">
              Accept calls, navigate routes, and coordinate traffic signals
            </p>
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              onClick={onViewCentral}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium"
            >
              System Monitor
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border text-foreground hover:border-accent hover:bg-accent/5 font-medium"
            >
              Switch Account
            </Button>
          </div>
        </div>

        {/* Ambulance Selection */}
        <Card className="mb-8 p-6 border-border bg-card/50 backdrop-blur border-2">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Assigned Ambulance
              </label>
              <Select value={selectedAmbulanceId} onValueChange={handleAmbulanceSelect}>
                <SelectTrigger className="max-w-xs bg-input border-border text-foreground">
                  <SelectValue placeholder="Select ambulance" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ambulances.map((amb) => (
                    <SelectItem key={amb.id} value={amb.id}>
                      <span className="font-medium">{amb.number}</span> •{' '}
                      <span className="text-sm">{amb.status}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAmbulance && (
              <div className="ml-auto pt-6">
                <div
                  className={`px-4 py-2 rounded-full border text-sm font-medium ${
                    selectedAmbulance.status === 'active'
                      ? 'bg-green-900/30 text-green-200 border-green-700'
                      : 'bg-blue-900/30 text-blue-200 border-blue-700'
                  }`}
                >
                  {selectedAmbulance.status === 'active' ? '🚨 In Emergency' : '✓ Available'}
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {activeRide && showRoute ? (
              <>
                <RouteMap
                  ride={activeRide}
                  ambulanceId={selectedAmbulanceId}
                  progress={routeProgress}
                  onProgressChange={setRouteProgress}
                />

                <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-foreground">Active Emergency Ride</h2>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/30 text-green-200 border border-green-700 text-sm font-semibold">
                      <Zap className="w-4 h-4 animate-pulse" />
                      Emergency Active
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Patient Information */}
                    <div className="bg-card border border-border/50 p-4 rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Patient Name
                      </p>
                      <p className="font-bold text-foreground text-lg">{activeRide.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Emergency Type:{' '}
                        <span className="text-foreground font-semibold capitalize">
                          {activeRide.emergencyType === 'cardiac'
                            ? 'Cardiac Emergency'
                            : 'General Emergency'}
                        </span>
                      </p>
                    </div>

                    {/* Location Information */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-card border border-border/50 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Pickup Location
                        </p>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <p className="font-semibold text-foreground text-sm">
                            {activeRide.pickupLocation}
                          </p>
                        </div>
                      </div>
                      <div className="bg-card border border-border/50 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Destination
                        </p>
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="font-semibold text-foreground text-sm">
                            {
                              {
                                irwin: 'Irwin Hospital',
                                pdmc: 'PDMC Hospital',
                                dayasagar: 'Dayasagar Hospital',
                              }[activeRide.hospital]
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hospital Details */}
                    <div className="bg-gradient-to-br from-primary/15 via-card to-accent/10 border-2 border-primary/40 p-5 rounded-lg shadow-lg">
                      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-accent" />
                        Hospital Destination
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          {activeRide.hospital === 'irwin' && (
                            <>
                              <p className="text-foreground font-bold text-lg">Irwin Hospital</p>
                              <p className="text-muted-foreground text-sm">Main Street, Fort Area</p>
                            </>
                          )}
                          {activeRide.hospital === 'pdmc' && (
                            <>
                              <p className="text-foreground font-bold text-lg">PDMC Hospital</p>
                              <p className="text-muted-foreground text-sm">
                                Marine Drive, Coastal Area
                              </p>
                            </>
                          )}
                          {activeRide.hospital === 'dayasagar' && (
                            <>
                              <p className="text-foreground font-bold text-lg">Dayasagar Hospital</p>
                              <p className="text-muted-foreground text-sm">
                                Downtown Hub, Central City
                              </p>
                            </>
                          )}
                        </div>

                        <div className="bg-card border border-accent/30 rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Distance
                          </p>
                          {activeRide.hospital === 'irwin' && (
                            <p className="text-2xl font-bold text-accent">2.5 km</p>
                          )}
                          {activeRide.hospital === 'pdmc' && (
                            <p className="text-2xl font-bold text-accent">3.2 km</p>
                          )}
                          {activeRide.hospital === 'dayasagar' && (
                            <p className="text-2xl font-bold text-accent">2.8 km</p>
                          )}
                        </div>

                        <div className="bg-card border border-green-500/30 rounded-lg p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            ETA
                          </p>
                          <p className="text-2xl font-bold text-green-400">
                            {Math.max(1, Math.floor((100 - routeProgress) / 12))} min
                          </p>
                        </div>

                        <div className="col-span-2">
                          <p className="text-sm text-foreground mb-2">
                            <span className="text-muted-foreground">Contact:</span>{' '}
                            <span className="font-semibold">+91-XXXX-XXXXX</span>
                          </p>
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">Status:</span>{' '}
                            <span className="font-semibold text-green-400">
                              24/7 Emergency Available
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-card border border-border/50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Journey Progress
                      </p>
                      <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-300"
                          style={{ width: `${routeProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {Math.round(routeProgress)}% Complete
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCompleteRide}
                    className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-6 flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Complete Emergency Ride
                  </Button>
                </Card>

                <TrafficControl ambulanceId={selectedAmbulanceId} />
              </>
            ) : (
              <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-accent animate-pulse" />
                  Emergency Dispatch Queue
                </h2>

                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground text-lg">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests
                      .filter((r) => r.status === 'waiting')
                      .map((request) => (
                        <div
                          key={request.id}
                          className="p-5 bg-card border border-border/50 rounded-lg hover:border-yellow-500/50 hover:bg-card/70 transition-all"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-foreground">{request.patientName}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.emergencyType === 'cardiac' ? '🏥 Cardiac' : '⚕️ General'}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-yellow-900/30 text-yellow-200 border border-yellow-700">
                              Waiting
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            📍 {request.pickupLocation}
                          </p>
                          <Button
                            onClick={() => handleAcceptRide(request.id)}
                            disabled={!selectedAmbulanceId}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 disabled:opacity-50"
                          >
                            ✓ Accept & Dispatch
                          </Button>
                        </div>
                      ))}

                    {requests.filter((r) => r.status === 'assigned').length > 0 && (
                      <>
                        <h3 className="font-semibold text-foreground mt-6 mb-3">Assigned Rides</h3>
                        {requests
                          .filter((r) => r.status === 'assigned')
                          .map((request) => (
                            <div
                              key={request.id}
                              className="p-4 bg-background/50 border border-border rounded-lg"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {request.patientName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Ambulance: {request.ambulanceId}
                                  </p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded bg-blue-900/30 text-blue-200 border border-blue-700">
                                  Assigned
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                📍 {request.pickupLocation}
                              </p>
                              {request.ambulanceId === selectedAmbulanceId && (
                                <Button
                                  onClick={handleStartRide}
                                  className="w-full bg-accent hover:bg-accent/80 text-accent-foreground"
                                >
                                  Start Emergency Ride
                                </Button>
                              )}
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Ambulance Status Sidebar */}
          <Card className="p-6 border-border bg-card h-fit">
            <h2 className="text-xl font-bold text-foreground mb-4">
              <Truck className="w-5 h-5 inline mr-2" />
              Ambulance Status
            </h2>

            {currentAmbulance ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="text-lg font-semibold text-foreground">{currentAmbulance.number}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        currentAmbulance.status === 'available'
                          ? 'bg-green-500'
                          : currentAmbulance.status === 'active'
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <p className="font-semibold text-foreground capitalize">
                      {currentAmbulance.status}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">GPS Coordinates</p>
                  <p className="text-sm text-foreground font-mono">
                    {currentAmbulance.gpsLat?.toFixed(4)}, {currentAmbulance.gpsLng?.toFixed(4)}
                  </p>
                </div>

                <div className="bg-secondary/30 p-3 rounded-lg border border-secondary/50">
                  <p className="text-xs text-muted-foreground mb-1">Quick Stats</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Requests</p>
                      <p className="text-lg font-bold text-foreground">{requests.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active</p>
                      <p className="text-lg font-bold text-foreground">{activeRide ? 1 : 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Select an ambulance</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
