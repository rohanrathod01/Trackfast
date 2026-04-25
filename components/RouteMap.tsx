'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { EmergencyRequest, getAmbulance, updateAmbulance } from '@/lib/storage';
import { Truck, MapPin, Hospital } from 'lucide-react';

interface RouteMapProps {
  ride: EmergencyRequest;
  ambulanceId: string;
  progress: number;
  onProgressChange: (progress: number) => void;
}

export default function RouteMap({
  ride,
  ambulanceId,
  progress,
  onProgressChange,
}: RouteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hospital coordinates for different hospitals
  const hospitalCoords: Record<string, { lat: number; lng: number; name: string }> = {
    irwin: { lat: 19.085, lng: 72.851, name: 'Irwin Hospital' },
    pdmc: { lat: 19.078, lng: 72.845, name: 'PDMC Hospital' },
    dayasagar: { lat: 19.092, lng: 72.855, name: 'Dayasagar Hospital' },
  };

  const startCoord = { lat: 19.076, lng: 72.8479 };
  const endCoord = hospitalCoords[ride.hospital];

  // Generate route points
  const generateRoute = () => {
    const points = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        lat: startCoord.lat + (endCoord.lat - startCoord.lat) * t,
        lng: startCoord.lng + (endCoord.lng - startCoord.lng) * t,
      });
    }
    return points;
  };

  const routePoints = generateRoute();

  useEffect(() => {
    const interval = setInterval(() => {
      onProgressChange((prev) => {
        const newProgress = (prev + 1) % (routePoints.length * 100);
        return newProgress;
      });

      // Update ambulance GPS coordinates
      const pointIndex = Math.floor((progress / 100) * (routePoints.length - 1));
      if (pointIndex < routePoints.length) {
        const point = routePoints[pointIndex];
        const ambulance = getAmbulance(ambulanceId);
        if (ambulance) {
          updateAmbulance(ambulanceId, {
            gpsLat: point.lat,
            gpsLng: point.lng,
          });
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [ambulanceId, onProgressChange, progress, routePoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 450;

    // Padding
    const padding = 50;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1a1f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate bounds
    const latMin = Math.min(startCoord.lat, endCoord.lat) - 0.01;
    const latMax = Math.max(startCoord.lat, endCoord.lat) + 0.01;
    const lngMin = Math.min(startCoord.lng, endCoord.lng) - 0.01;
    const lngMax = Math.max(startCoord.lng, endCoord.lng) + 0.01;

    const latRange = latMax - latMin;
    const lngRange = lngMax - lngMin;

    // Convert geo coords to canvas coords
    const geoToCanvas = (lat: number, lng: number) => {
      const x = padding + ((lng - lngMin) / lngRange) * width;
      const y = padding + ((latMax - lat) / latRange) * height;
      return { x, y };
    };

    // Draw grid background
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i + padding;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Draw route (planned path)
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const firstPoint = geoToCanvas(routePoints[0].lat, routePoints[0].lng);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < routePoints.length; i++) {
      const point = geoToCanvas(routePoints[i].lat, routePoints[i].lng);
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();

    // Draw completed route
    const pointIndex = Math.floor((progress / 100) * (routePoints.length - 1));
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (let i = 1; i <= pointIndex && i < routePoints.length; i++) {
      const point = geoToCanvas(routePoints[i].lat, routePoints[i].lng);
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();

    // Draw start point (Pickup location)
    const startPoint = geoToCanvas(startCoord.lat, startCoord.lng);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw end point (Hospital)
    const endPoint = geoToCanvas(endCoord.lat, endCoord.lng);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw ambulance current position with glow effect
    if (pointIndex < routePoints.length) {
      const currentPoint = geoToCanvas(
        routePoints[pointIndex].lat,
        routePoints[pointIndex].lng
      );
      
      // Glow effect
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Ambulance marker
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Pulse ring
      const pulseRadius = 12 + ((Date.now() % 1000) / 1000) * 4;
      ctx.strokeStyle = `rgba(239, 68, 68, ${1 - ((Date.now() % 1000) / 1000)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📍 Pickup', startPoint.x, startPoint.y + 20);
    ctx.fillText('🏥 Hospital', endPoint.x, endPoint.y + 20);

    // Draw progress indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(padding, canvas.height - 20, width, 15);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(padding, canvas.height - 20, (width * progress) / (routePoints.length * 100), 15);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round((progress / (routePoints.length * 100)) * 100)}%`, canvas.width / 2, canvas.height - 7);
  }, [progress, routePoints, startCoord, endCoord]);

  return (
    <Card className="p-6 border-border bg-card/50 backdrop-blur border-2">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Truck className="w-5 h-5 text-accent" />
        Live Route Tracking
      </h2>
      <div className="bg-background/50 rounded-lg overflow-hidden border border-border/50 shadow-lg">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: '450px', display: 'block' }}
        />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-muted-foreground">Pickup Location</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-muted-foreground">Hospital Destination</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-muted-foreground">Ambulance Position</span>
        </div>
      </div>
    </Card>
  );
}
