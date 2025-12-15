import React, { useState, useEffect, useCallback } from 'react';
import { Coordinates, Place } from './types';
import { findHiddenPlaces } from './services/geminiService';
import { LoadingCompass } from './components/LoadingCompass';
import { PlaceCard } from './components/PlaceCard';
import { MapPin, Compass, LocateFixed, RotateCcw, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);

  const getPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      }
    });
  }, []);

  const initializeLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const position = await getPosition();
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      
      setCurrentLocation(coords);
      // Only set start location once per session
      if (!startLocation) {
        setStartLocation(coords);
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Please enable location services to find hidden spots around you.";
      if (err.code === 1) { // PERMISSION_DENIED
         msg = "Location permission was denied. Please enable it in your browser settings.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [getPosition, startLocation]);

  useEffect(() => {
    // Check permission status on mount
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.onchange = () => {
          setPermissionStatus(result.state);
        };
      }).catch(() => {
        // Ignore permission query errors (some browsers might not support it fully)
      });
    }
    
    initializeLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleDiscover = async () => {
    // Always try to initialize location if missing, regardless of previous permission status
    // This allows the user to click "Find" again after changing settings.
    if (!currentLocation) {
      await initializeLocation();
      // We check currentLocation from state in the next render, but here we can't await state update.
      // So we'll try getPosition directly again to proceed immediately if successful.
    }
    
    setLoading(true);
    setError(null);
    try {
      // Refresh location slightly before search to ensure accuracy
      const position = await getPosition();
      const freshCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setCurrentLocation(freshCoords);
      if (!startLocation) setStartLocation(freshCoords);
      
      const newPlaces = await findHiddenPlaces(freshCoords);
      setPlaces(newPlaces);
    } catch (err: any) {
      let errorMessage = "Something went wrong while exploring.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        if (err.message.includes("User denied") || (err as any).code === 1) {
            errorMessage = "Location permission denied. Please enable it in settings and try again.";
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Prevent [object Object] from being displayed
      if (errorMessage === '[object Object]' || typeof errorMessage === 'object') {
        errorMessage = "An unexpected error occurred.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToStart = () => {
    if (!startLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${startLocation.latitude},${startLocation.longitude}&travelmode=walking`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-24">
      {/* Header / Top Bar */}
      <header className="sticky top-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white">
            <Compass size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-stone-900">Hidden Gems</h1>
        </div>
        
        {startLocation && (
           <button 
             onClick={handleReturnToStart}
             className="p-2 rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 active:scale-95 transition-all"
             aria-label="Return to start"
             title="Return to starting point"
           >
             <RotateCcw size={18} />
           </button>
        )}
      </header>

      <main className="max-w-md mx-auto px-6 py-8">
        {/* Intro / Empty State */}
        {places.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-stone-200 mb-6">
              <MapPin className="text-stone-500 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif text-stone-800 mb-3">Where are you now?</h2>
            <p className="text-stone-500 mb-8 leading-relaxed">
              We'll scan the area around you to find quiet, interesting spots that most guides miss.
            </p>
            {permissionStatus === 'denied' ? (
              <div className="p-4 bg-orange-50 text-orange-800 rounded-lg text-sm mb-4 border border-orange-100 flex flex-col gap-3 text-left">
                <div className="flex gap-2 items-start">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>Location blocked. Enable in browser settings.</span>
                </div>
                <button 
                  onClick={initializeLocation}
                  className="self-start px-3 py-1.5 bg-white border border-orange-200 rounded text-xs font-bold uppercase tracking-wide text-orange-900 shadow-sm hover:bg-orange-50"
                >
                  Check Again
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 flex items-start gap-3 text-red-700">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Connection Lost</p>
              <p className="text-xs opacity-80 mt-1">{error}</p>
              <button 
                onClick={handleDiscover}
                className="mt-3 text-xs font-bold uppercase tracking-wider underline decoration-red-300 hover:decoration-red-700 underline-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingCompass />}

        {/* Results List */}
        {!loading && places.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-medium text-stone-400 uppercase tracking-widest">Discoveries Nearby</h3>
               <button 
                onClick={() => setPlaces([])} // simple reset
                className="text-xs text-stone-400 underline hover:text-stone-600"
               >
                 Clear
               </button>
            </div>
            {places.map((place, index) => (
              <PlaceCard key={index} place={place} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none">
        <button
          onClick={handleDiscover}
          disabled={loading}
          className={`
            pointer-events-auto
            flex items-center gap-3 px-8 py-4 rounded-full shadow-xl 
            font-medium tracking-wide transition-all transform active:scale-95
            ${loading 
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
              : 'bg-stone-900 text-white hover:bg-black hover:shadow-2xl hover:-translate-y-1'
            }
          `}
        >
          {loading ? (
            'Searching...'
          ) : (
            <>
              <LocateFixed size={20} />
              <span>Find Hidden Places</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default App;