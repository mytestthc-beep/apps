import React from 'react';
import { Compass } from 'lucide-react';

export const LoadingCompass: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse text-stone-400">
      <Compass className="w-16 h-16 animate-spin duration-[3000ms]" strokeWidth={1} />
      <p className="mt-4 text-sm font-medium tracking-widest uppercase">Scouting area...</p>
    </div>
  );
};
