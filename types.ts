export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Place {
  name: string;
  description: string;
  type: string;
  reason: string;
  estimatedDistance: string;
}

export interface AppState {
  currentLocation: Coordinates | null;
  startLocation: Coordinates | null;
  places: Place[];
  loading: boolean;
  error: string | null;
}
