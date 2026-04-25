'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getIntersections, Intersection } from '@/lib/storage';
import { AlertTriangle } from 'lucide-react';

interface TrafficControlProps {
  ambulanceId: string;
}

export default function TrafficControl({ ambulanceId }: TrafficControlProps) {
  const [intersections, setIntersections] = useState<Intersection[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIntersections(getIntersections());
    }, 500);
    setIntersections(getIntersections());
    return () => clearInterval(timer);
  }, []);

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
      <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-accent" />
        Real-Time Traffic Signal Management
      </h2>

      <div className="space-y-4">
        {intersections.map((intersection) => (
          <div
            key={intersection.id}
            className={`p-5 rounded-lg border-2 transition-all ${
              intersection.alertActive
                ? 'bg-red-900/20 border-red-600/60 shadow-lg shadow-red-500/10'
                : 'bg-card border-border/50 hover:border-border'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-foreground">{intersection.name}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  intersection.alertActive
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                {intersection.alertActive ? 'ALERT' : 'NORMAL'}
              </span>
            </div>

            <div className="flex gap-2 justify-center mb-3">
              {/* Traffic lights */}
              <div className="flex flex-col gap-2">
                {/* Red light */}
                <div
                  className={`w-8 h-8 rounded-full transition-all ${
                    intersection.trafficMode === 'emergency'
                      ? 'bg-red-500 shadow-lg shadow-red-500'
                      : 'bg-gray-600'
                  }`}
                />
                {/* Yellow light */}
                <div className="w-8 h-8 rounded-full bg-gray-600" />
                {/* Green light */}
                <div
                  className={`w-8 h-8 rounded-full transition-all ${
                    intersection.trafficMode === 'emergency'
                      ? 'bg-gray-600'
                      : 'bg-green-500 shadow-lg shadow-green-500'
                  }`}
                />
              </div>

              <div className="flex-1 ml-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cross Traffic</span>
                    <span
                      className={`text-sm font-semibold ${
                        intersection.trafficMode === 'emergency'
                          ? 'text-red-400'
                          : 'text-green-400'
                      }`}
                    >
                      {intersection.trafficMode === 'emergency' ? 'STOPPED' : 'FLOWING'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ambulance Path</span>
                    <span
                      className={`text-sm font-semibold ${
                        intersection.trafficMode === 'emergency'
                          ? 'text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {intersection.trafficMode === 'emergency' ? 'CLEARED' : 'NORMAL'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
              📍 Position: {intersection.position.lat.toFixed(4)}, {intersection.position.lng.toFixed(4)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Emergency Protocol:</strong> When ambulances are en route, traffic signals automatically switch to emergency mode. Cross traffic is halted and the ambulance path is cleared for maximum speed and safety.
        </p>
      </div>
    </Card>
  );
}
