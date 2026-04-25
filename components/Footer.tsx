'use client';

import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">
              Emergency Response System
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Advanced real-time ambulance dispatch and emergency coordination platform. 
              Optimizing emergency response times through intelligent routing and live tracking.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  GitHub Repository
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Report Issues
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Features</h3>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">Real-Time GPS Tracking</li>
              <li className="text-muted-foreground">Smart Traffic Management</li>
              <li className="text-muted-foreground">Live ETA Calculation</li>
              <li className="text-muted-foreground">Central Monitoring</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-6">
          {/* Creator Attribution */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Created with</span>
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span className="text-muted-foreground">by</span>
              <span className="font-bold text-foreground">Atharv Hatwar</span>
            </div>

            {/* Copyright and Version */}
            <div className="text-xs text-muted-foreground text-center md:text-right">
              <p>&copy; 2026 Smart Ambulance Emergency Management System</p>
              <p>Version 1.0.0 | All Rights Reserved</p>
            </div>
          </div>

          {/* Tech Stack Info */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Built with Next.js • React • TypeScript • Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
