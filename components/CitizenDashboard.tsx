'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createEmergencyRequest,
  getEmergencyRequests,
  setUserRole,
  EmergencyRequest,
} from '@/lib/storage';
import { MapPin, Phone, AlertCircle, Check } from 'lucide-react';

interface CitizenDashboardProps {
  onViewCentral: () => void;
  onLogout: () => void;
}

export default function CitizenDashboard({ onViewCentral, onLogout }: CitizenDashboardProps) {
  const [formData, setFormData] = useState({
    patientName: '',
    emergencyType: 'general' as 'general' | 'cardiac',
    pickupLocation: '',
    hospital: 'irwin' as 'irwin' | 'pdmc' | 'dayasagar',
  });

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setRequests(getEmergencyRequests());
    }, 1000);
    setRequests(getEmergencyRequests());
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const newRequest = createEmergencyRequest(
        formData.patientName,
        formData.emergencyType,
        formData.pickupLocation,
        formData.hospital
      );

      setFormData({
        patientName: '',
        emergencyType: 'general',
        pickupLocation: '',
        hospital: 'irwin',
      });
      setRequests(getEmergencyRequests());
      setIsLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    setUserRole(null);
    onLogout();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-900/30 text-yellow-200 border-yellow-700';
      case 'assigned':
        return 'bg-blue-900/30 text-blue-200 border-blue-700';
      case 'active':
        return 'bg-green-900/30 text-green-200 border-green-700';
      case 'completed':
        return 'bg-green-900/30 text-green-200 border-green-700';
      default:
        return 'bg-gray-900/30 text-gray-200 border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <AlertCircle className="w-4 h-4" />;
      case 'assigned':
      case 'active':
        return <Phone className="w-4 h-4" />;
      case 'completed':
        return <Check className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-5xl font-bold text-foreground mb-2">Emergency Services</h1>
            <p className="text-muted-foreground text-lg">Request ambulance assistance and track response in real-time</p>
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <button
              onClick={onViewCentral}
              className="px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-all duration-200 font-medium"
            >
              System Monitor
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 border border-border text-foreground rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 font-medium"
            >
              Switch Account
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Request Form */}
          <Card className="md:col-span-2 p-8 border-border bg-card/50 backdrop-blur border-2 hover:border-primary/50 transition-colors">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-accent" />
              Emergency Request Form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-foreground mb-2">Patient Name</label>
                <Input
                  type="text"
                  placeholder="Enter patient name"
                  value={formData.patientName}
                  onChange={(e) =>
                    setFormData({ ...formData, patientName: e.target.value })
                  }
                  required
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Emergency Type</label>
                <Select
                  value={formData.emergencyType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      emergencyType: value as 'general' | 'cardiac',
                    })
                  }
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="general">General Emergency</SelectItem>
                    <SelectItem value="cardiac">Cardiac Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Pickup Location
                </label>
                <Input
                  type="text"
                  placeholder="Enter pickup location"
                  value={formData.pickupLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, pickupLocation: e.target.value })
                  }
                  required
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Hospital</label>
                <Select
                  value={formData.hospital}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hospital: value as 'irwin' | 'pdmc' | 'dayasagar' })
                  }
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="irwin">General Hospital - Irwin Hospital</SelectItem>
                    <SelectItem value="pdmc">PDMC Hospital (Cardiac)</SelectItem>
                    <SelectItem value="dayasagar">Dayasagar Hospital (Emergency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 transition-all duration-200 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                    Processing Request
                  </span>
                ) : (
                  '🚨 Request Ambulance Now'
                )}
              </Button>
            </form>
          </Card>

          {/* Stats Card */}
          <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
            <h2 className="text-xl font-bold text-foreground mb-6">Your Activity</h2>

            <div className="space-y-3">
              <div className="bg-card border border-border/50 p-4 rounded-lg hover:border-primary/30 transition-colors">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Requests</p>
                <p className="text-4xl font-bold text-primary mt-2">{requests.length}</p>
              </div>

              <div className="bg-card border border-border/50 p-4 rounded-lg hover:border-yellow-500/30 transition-colors">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-4xl font-bold text-yellow-300 mt-2">
                  {requests.filter((r) => r.status === 'waiting').length}
                </p>
              </div>

              <div className="bg-card border border-border/50 p-4 rounded-lg hover:border-green-500/30 transition-colors">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-4xl font-bold text-green-300 mt-2">
                  {requests.filter((r) => r.status === 'completed').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card className="mt-8 p-8 border-border bg-card/50 backdrop-blur border-2">
          <h2 className="text-2xl font-bold text-foreground mb-6">Active Requests</h2>

          {requests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">No active requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-5 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-foreground text-lg">
                          {request.patientName}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          request.emergencyType === 'cardiac' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-orange-500/20 text-orange-300'
                        }`}>
                          {request.emergencyType === 'cardiac' ? 'CARDIAC' : 'GENERAL'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-accent" />
                        {request.pickupLocation} → {
                          {
                            irwin: 'Irwin Hospital',
                            pdmc: 'PDMC Hospital',
                            dayasagar: 'Dayasagar Hospital',
                          }[request.hospital]
                        }
                      </p>
                      
                      {/* Estimated reach time based on status */}
                      {request.status === 'waiting' && (
                        <p className="text-xs text-yellow-300 font-semibold flex items-center gap-1">
                          ⏱️ Estimated ambulance arrival: 5-8 minutes
                        </p>
                      )}
                      {request.status === 'assigned' && (
                        <p className="text-xs text-blue-300 font-semibold flex items-center gap-1">
                          🚨 Ambulance dispatched • Est. arrival: 4-6 minutes
                        </p>
                      )}
                      {request.status === 'active' && (
                        <p className="text-xs text-green-300 font-semibold flex items-center gap-1">
                          ✓ En route to hospital • Est. arrival: {Math.max(1, Math.floor(Math.random() * 8 + 3))} minutes
                        </p>
                      )}
                      {request.status === 'completed' && (
                        <p className="text-xs text-green-300 font-semibold flex items-center gap-1">
                          ✓ Reached hospital safely
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium text-sm whitespace-nowrap ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusIcon(request.status)}
                      <span className="capitalize">{request.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
