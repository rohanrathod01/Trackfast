// Types for the ambulance management system
export interface EmergencyRequest {
  id: string;
  patientName: string;
  emergencyType: 'general' | 'cardiac';
  pickupLocation: string;
  hospital: 'irwin' | 'pdmc' | 'dayasagar';
  status: 'waiting' | 'assigned' | 'active' | 'completed';
  requestedAt: number;
  ambulanceId?: string;
  gpsCoordinates?: { lat: number; lng: number };
  route?: { lat: number; lng: number }[];
  currentIntersection?: string;
}

export interface Ambulance {
  id: string;
  number: string;
  status: 'available' | 'assigned' | 'active' | 'inactive';
  currentRideId?: string;
  gpsLat?: number;
  gpsLng?: number;
  createdAt: number;
}

export interface RideHistory {
  id: string;
  requestId: string;
  ambulanceId: string;
  startTime: number;
  endTime?: number;
  distance?: number;
  duration?: number;
  status: 'completed' | 'cancelled';
}

export interface Intersection {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  trafficMode: 'normal' | 'emergency';
  alertActive: boolean;
}

// Storage keys
const KEYS = {
  REQUESTS: 'ambulance_requests',
  AMBULANCES: 'ambulances',
  RIDE_HISTORY: 'ride_history',
  INTERSECTIONS: 'intersections',
  USER_ROLE: 'user_role',
  SELECTED_AMBULANCE: 'selected_ambulance',
};

// Initialize default data
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  // Initialize ambulances if not present
  if (!localStorage.getItem(KEYS.AMBULANCES)) {
    const ambulances: Ambulance[] = [
      {
        id: '1',
        number: 'AMB-2401',
        status: 'available',
        createdAt: Date.now(),
      },
      {
        id: '2',
        number: 'AMB-2402',
        status: 'available',
        createdAt: Date.now(),
      },
      {
        id: '3',
        number: 'AMB-2403',
        status: 'available',
        createdAt: Date.now(),
      },
      {
        id: '4',
        number: 'AMB-2404',
        status: 'available',
        createdAt: Date.now(),
      },
      {
        id: '5',
        number: 'AMB-2405',
        status: 'available',
        createdAt: Date.now(),
      },
    ];
    localStorage.setItem(KEYS.AMBULANCES, JSON.stringify(ambulances));
  }

  // Initialize intersections if not present
  if (!localStorage.getItem(KEYS.INTERSECTIONS)) {
    const intersections: Intersection[] = [
      {
        id: '1',
        name: 'Fort Main Junction',
        position: { lat: 19.076, lng: 72.8479 },
        trafficMode: 'normal',
        alertActive: false,
      },
      {
        id: '2',
        name: 'Marine Drive Crossing',
        position: { lat: 19.082, lng: 72.849 },
        trafficMode: 'normal',
        alertActive: false,
      },
      {
        id: '3',
        name: 'Downtown Hub',
        position: { lat: 19.088, lng: 72.85 },
        trafficMode: 'normal',
        alertActive: false,
      },
    ];
    localStorage.setItem(KEYS.INTERSECTIONS, JSON.stringify(intersections));
  }

  // Initialize other collections if not present
  if (!localStorage.getItem(KEYS.REQUESTS)) {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.RIDE_HISTORY)) {
    localStorage.setItem(KEYS.RIDE_HISTORY, JSON.stringify([]));
  }
}

// Emergency Request Methods
export function createEmergencyRequest(
  patientName: string,
  emergencyType: 'general' | 'cardiac',
  pickupLocation: string,
  hospital: 'irwin' | 'pdmc' | 'dayasagar'
): EmergencyRequest {
  const request: EmergencyRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    patientName,
    emergencyType,
    pickupLocation,
    hospital,
    status: 'waiting',
    requestedAt: Date.now(),
  };

  const requests = getEmergencyRequests();
  requests.push(request);
  localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));

  return request;
}

export function getEmergencyRequests(): EmergencyRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.REQUESTS) || '[]');
  } catch {
    return [];
  }
}

export function updateEmergencyRequest(id: string, updates: Partial<EmergencyRequest>) {
  const requests = getEmergencyRequests();
  const index = requests.findIndex((r) => r.id === id);
  if (index !== -1) {
    requests[index] = { ...requests[index], ...updates };
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
  }
}

export function getEmergencyRequest(id: string): EmergencyRequest | null {
  const requests = getEmergencyRequests();
  return requests.find((r) => r.id === id) || null;
}

// Ambulance Methods
export function getAmbulances(): Ambulance[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.AMBULANCES) || '[]');
  } catch {
    return [];
  }
}

export function updateAmbulance(id: string, updates: Partial<Ambulance>) {
  const ambulances = getAmbulances();
  const index = ambulances.findIndex((a) => a.id === id);
  if (index !== -1) {
    ambulances[index] = { ...ambulances[index], ...updates };
    localStorage.setItem(KEYS.AMBULANCES, JSON.stringify(ambulances));
  }
}

export function getAmbulance(id: string): Ambulance | null {
  const ambulances = getAmbulances();
  return ambulances.find((a) => a.id === id) || null;
}

// Ride History Methods
export function addRideHistory(history: RideHistory) {
  const histories = getRideHistory();
  histories.push(history);
  localStorage.setItem(KEYS.RIDE_HISTORY, JSON.stringify(histories));
}

export function getRideHistory(): RideHistory[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.RIDE_HISTORY) || '[]');
  } catch {
    return [];
  }
}

// Intersection Methods
export function getIntersections(): Intersection[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.INTERSECTIONS) || '[]');
  } catch {
    return [];
  }
}

export function updateIntersection(id: string, updates: Partial<Intersection>) {
  const intersections = getIntersections();
  const index = intersections.findIndex((i) => i.id === id);
  if (index !== -1) {
    intersections[index] = { ...intersections[index], ...updates };
    localStorage.setItem(KEYS.INTERSECTIONS, JSON.stringify(intersections));
  }
}

// User Role Management
export function setUserRole(role: 'citizen' | 'driver') {
  localStorage.setItem(KEYS.USER_ROLE, role);
}

export function getUserRole(): 'citizen' | 'driver' | null {
  try {
    return (localStorage.getItem(KEYS.USER_ROLE) || null) as 'citizen' | 'driver' | null;
  } catch {
    return null;
  }
}

// Selected Ambulance (for driver)
export function setSelectedAmbulance(id: string) {
  localStorage.setItem(KEYS.SELECTED_AMBULANCE, id);
}

export function getSelectedAmbulance(): string | null {
  try {
    return localStorage.getItem(KEYS.SELECTED_AMBULANCE);
  } catch {
    return null;
  }
}
