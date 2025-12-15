import React from 'react';
import { Place } from '../types';
import { MapPin, Navigation } from 'lucide-react';

interface PlaceCardProps {
  place: Place;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;

  return (
    <div className="group relative bg-white border border-stone-100 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-orange-200">
      <div className="flex justify-between items-start mb-3">
        <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-stone-500 bg-stone-100 rounded-full group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
          {place.type}
        </span>
        <span className="text-xs text-stone-400 font-medium">{place.estimatedDistance}</span>
      </div>
      
      <h3 className="text-xl font-serif text-stone-800 mb-2 leading-tight">
        {place.name}
      </h3>
      
      <p className="text-stone-500 text-sm leading-relaxed mb-4">
        {place.description}
      </p>

      <div className="pt-4 border-t border-stone-50 flex items-center justify-between">
        <p className="text-xs text-stone-400 italic pr-4">"{place.reason}"</p>
        <a 
          href={mapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-stone-900 text-white hover:bg-orange-600 transition-colors"
          aria-label={`Navigate to ${place.name}`}
        >
          <Navigation size={16} />
        </a>
      </div>
    </div>
  );
};
