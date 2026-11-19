import React from 'react';
import { Award, X } from 'lucide-react';
import { MedalSpec } from '../data/medals';
import { MedalArtwork } from './MedalArtwork';

interface MedalUnlockToastProps {
  medal: MedalSpec | null;
  onDismiss: () => void;
  onOpenMedals: () => void;
}

export const MedalUnlockToast: React.FC<MedalUnlockToastProps> = ({
  medal,
  onDismiss,
  onOpenMedals,
}) => {
  if (!medal) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 right-6 z-30 w-[330px] max-w-[90vw] bg-slate-900 border border-amber-400/80 rounded-xl p-3.5 shadow-2xl transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <MedalArtwork medal={medal} unlocked={true} size={52} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>
                {medal.isMaster ? 'Medalha Suprema Desbloqueada!' : 'Nova Medalha Desbloqueada!'}
              </span>
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Fechar aviso de medalha"
              className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="mt-0.5 font-display text-sm font-bold text-white truncate">
            {medal.title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-300 leading-snug">
            {medal.description}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMedals}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 rounded-md hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver Quadro de Medalhas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
