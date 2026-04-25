'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { setUserRole } from '@/lib/storage';
import { User, Truck, Activity, MapPin } from 'lucide-react';

interface RoleSelectionProps {
  onSelectRole: (role: 'citizen' | 'driver') => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const handleCitizen = () => {
    setUserRole('citizen');
    onSelectRole('citizen');
  };

  const handleDriver = () => {
    setUserRole('driver');
    onSelectRole('driver');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8 gap-4">
            <div className="p-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl border border-primary/40 animate-pulse">
              <Activity className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-6xl font-black text-foreground bg-clip-text leading-tight">
                Emergency Response
              </h1>
              <h1 className="text-5xl font-bold text-accent leading-tight">
                Management System
              </h1>
            </div>
          </div>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            Advanced real-time ambulance dispatch and emergency coordination platform. Experience intelligent routing, live tracking, and automatic traffic management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Citizen Role */}
          <Card 
            className="p-8 border-border bg-gradient-to-br from-card via-card/80 to-card/60 backdrop-blur hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer group border-2 transform hover:-translate-y-2"
            onClick={handleCitizen}
          >
            <div className="flex flex-col h-full">
              <div className="mb-8 p-8 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl group-hover:from-primary/30 group-hover:to-primary/20 transition-all w-fit mx-auto border border-primary/30">
                <User className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
                Patient Portal
              </h2>
              <p className="text-muted-foreground mb-4 text-center text-base leading-relaxed">
                Request emergency ambulance services with real-time tracking and live GPS updates.
              </p>
              <ul className="text-sm text-muted-foreground mb-8 space-y-2 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  Real-time ambulance location tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  Estimated arrival time updates
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                  Hospital destination details
                </li>
              </ul>
              <Button
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCitizen();
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg w-full transition-all duration-200 transform hover:scale-105"
              >
                Request Ambulance Now
              </Button>
            </div>
          </Card>

          {/* Driver Role */}
          <Card 
            className="p-8 border-border bg-gradient-to-br from-card via-card/80 to-card/60 backdrop-blur hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/20 transition-all duration-300 cursor-pointer group border-2 transform hover:-translate-y-2"
            onClick={handleDriver}
          >
            <div className="flex flex-col h-full">
              <div className="mb-8 p-8 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl group-hover:from-accent/30 group-hover:to-accent/20 transition-all w-fit mx-auto border border-accent/30">
                <Truck className="w-16 h-16 text-accent" />
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-4 text-center">
                Driver Dashboard
              </h2>
              <p className="text-muted-foreground mb-4 text-center text-base leading-relaxed">
                Accept emergency calls, navigate optimized routes, and coordinate with smart traffic systems.
              </p>
              <ul className="text-sm text-muted-foreground mb-8 space-y-2 flex-grow">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                  Incoming emergency dispatch queue
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                  Live GPS route tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                  Automated traffic signal management
                </li>
              </ul>
              <Button
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDriver();
                }}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-6 text-lg w-full transition-all duration-200 transform hover:scale-105"
              >
                Enter Driver Dashboard
              </Button>
            </div>
          </Card>
        </div>

        {/* Footer info */}
        <div className="text-center text-muted-foreground text-sm">
          <p>24/7 Emergency Response • Real-time Coordination • Intelligent Routing</p>
        </div>
      </div>
    </div>
  );
}
