'use client';

import { useEffect, useState } from 'react';
import { initializeStorage, getUserRole } from '@/lib/storage';
import RoleSelection from '@/components/RoleSelection';
import CitizenDashboard from '@/components/CitizenDashboard';
import DriverDashboard from '@/components/DriverDashboard';
import CentralDashboard from '@/components/CentralDashboard';
import Footer from '@/components/Footer';

export default function Home() {
  const [role, setRole] = useState<'citizen' | 'driver' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCentral, setShowCentral] = useState(false);

  useEffect(() => {
    initializeStorage();
    const savedRole = getUserRole();
    if (savedRole) {
      setRole(savedRole);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground text-lg font-medium">Initializing System</p>
          <p className="text-muted-foreground text-sm mt-2">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1">
          <RoleSelection onSelectRole={setRole} />
        </div>
        <Footer />
      </div>
    );
  }

  if (showCentral) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1">
          <CentralDashboard
            onBack={() => setShowCentral(false)}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1">
        {role === 'citizen' && (
          <CitizenDashboard 
            onViewCentral={() => setShowCentral(true)}
            onLogout={() => setRole(null)}
          />
        )}
        {role === 'driver' && (
          <DriverDashboard 
            onViewCentral={() => setShowCentral(true)}
            onLogout={() => setRole(null)}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
