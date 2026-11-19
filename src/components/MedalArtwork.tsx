import React from 'react';
import { MedalSpec } from '../data/medals';

interface MedalArtworkProps {
  medal: MedalSpec;
  unlocked: boolean;
  size?: number;
}

export const MedalArtwork: React.FC<MedalArtworkProps> = ({
  medal,
  unlocked,
  size = 54,
}) => {
  const ringStroke = unlocked
    ? medal.isMaster
      ? '#FACC15'
      : '#F59E0B'
    : '#475569';
  const fillPrimary = unlocked ? medal.accentHex : '#1E293B';
  const fillInner = unlocked ? '#0F172A' : '#0F172A';
  const iconStroke = unlocked ? '#FFFFFF' : '#64748B';
  const iconFill = unlocked ? medal.secondaryHex : '#334155';

  const renderSolidGlyph = () => {
    switch (medal.id) {
      case 'cube_cross':
        return (
          <g stroke={iconStroke} strokeWidth="2.2" strokeLinejoin="round">
            <polygon points="32,17 45,24 32,31 19,24" fill={iconFill} fillOpacity={unlocked ? 0.9 : 0.25} />
            <polygon points="19,24 32,31 32,45 19,38" fill={fillPrimary} fillOpacity={unlocked ? 0.95 : 0.35} />
            <polygon points="45,24 32,31 32,45 45,38" fill={iconFill} fillOpacity={unlocked ? 0.55 : 0.2} />
          </g>
        );
      case 'square_pyramid':
        return (
          <g stroke={iconStroke} strokeWidth="2.2" strokeLinejoin="round">
            <polygon points="32,16 17,40 32,45" fill={iconFill} fillOpacity={unlocked ? 0.85 : 0.25} />
            <polygon points="32,16 47,40 32,45" fill={fillPrimary} fillOpacity={unlocked ? 0.95 : 0.35} />
            <line x1="32" y1="16" x2="32" y2="45" />
          </g>
        );
      case 'triangular_prism':
        return (
          <g stroke={iconStroke} strokeWidth="2.2" strokeLinejoin="round">
            <polygon points="24,20 15,41 33,41" fill={iconFill} fillOpacity={unlocked ? 0.9 : 0.25} />
            <polygon points="24,20 40,20 49,41 33,41" fill={fillPrimary} fillOpacity={unlocked ? 0.95 : 0.35} />
          </g>
        );
      case 'rectangular_box':
        return (
          <g stroke={iconStroke} strokeWidth="2.2" strokeLinejoin="round">
            <polygon points="28,20 48,25 36,33 16,28" fill={iconFill} fillOpacity={unlocked ? 0.9 : 0.25} />
            <polygon points="16,28 36,33 36,44 16,39" fill={fillPrimary} fillOpacity={unlocked ? 0.95 : 0.35} />
            <polygon points="48,25 36,33 36,44 48,36" fill={iconFill} fillOpacity={unlocked ? 0.55 : 0.2} />
          </g>
        );
      case 'tetrahedron':
        return (
          <g stroke={iconStroke} strokeWidth="2.2" strokeLinejoin="round">
            <polygon points="32,16 17,42 47,42" fill={fillPrimary} fillOpacity={unlocked ? 0.85 : 0.3} />
            <line x1="32" y1="16" x2="35" y2="42" strokeOpacity="0.9" />
            <line x1="17" y1="42" x2="35" y2="33" strokeDasharray="3 2" strokeOpacity="0.7" />
            <line x1="47" y1="42" x2="35" y2="33" strokeDasharray="3 2" strokeOpacity="0.7" />
          </g>
        );
      case 'master_geometer':
        return (
          <g stroke={iconStroke} strokeWidth="2" strokeLinejoin="round">
            <polygon
              points="32,15 36.8,25.2 48,26.8 39.8,34.6 41.8,45.8 32,40.4 22.2,45.8 24.2,34.6 16,26.8 27.2,25.2"
              fill={unlocked ? '#FACC15' : '#334155'}
            />
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Top medal ribbons */}
      <path
        d="M22 4 L29 14 L21 15 L15 4 Z"
        fill={unlocked ? medal.accentHex : '#334155'}
        opacity={unlocked ? 0.9 : 0.45}
      />
      <path
        d="M42 4 L35 14 L43 15 L49 4 Z"
        fill={unlocked ? medal.secondaryHex : '#1E293B'}
        opacity={unlocked ? 0.9 : 0.45}
      />

      {/* Outer metallic octagon / circle bezel */}
      {medal.isMaster ? (
        <polygon
          points="32,8 48,14 55,31 48,48 32,55 16,48 9,31 16,14"
          fill={fillInner}
          stroke={ringStroke}
          strokeWidth="3.2"
        />
      ) : (
        <circle
          cx="32"
          cy="32"
          r="22"
          fill={fillInner}
          stroke={ringStroke}
          strokeWidth="3"
          strokeDasharray={unlocked ? undefined : '4 3'}
        />
      )}

      {/* Subtle inner accent ring */}
      <circle
        cx="32"
        cy="32"
        r="17.5"
        fill={unlocked ? medal.accentHex : '#0F172A'}
        fillOpacity={unlocked ? 0.16 : 1}
        stroke={unlocked ? medal.accentHex : '#334155'}
        strokeWidth="1.2"
      />

      {renderSolidGlyph()}
    </svg>
  );
};
