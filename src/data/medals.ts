export type MedalId =
  | 'cube_cross'
  | 'square_pyramid'
  | 'triangular_prism'
  | 'rectangular_box'
  | 'tetrahedron'
  | 'master_geometer';

export interface MedalSpec {
  id: MedalId;
  solidId: string | null; // null for master medal
  title: string;
  shortTitle: string;
  description: string;
  requirementText: string;
  accentHex: string;
  secondaryHex: string;
  isMaster?: boolean;
}

export const MEDALS: MedalSpec[] = [
  {
    id: 'cube_cross',
    solidId: 'cube_cross',
    title: 'Construtor do Cubo',
    shortTitle: 'Cubo',
    description: 'Fechou perfeitamente as 6 faces quadradas do Cubo.',
    requirementText: 'Monte o Cubo (Planificação em Cruz)',
    accentHex: '#3B82F6',
    secondaryHex: '#93C5FD',
  },
  {
    id: 'square_pyramid',
    solidId: 'square_pyramid',
    title: 'Explorador da Pirâmide',
    shortTitle: 'Pirâmide',
    description: 'Uniu a base quadrada e os 4 triângulos no vértice superior.',
    requirementText: 'Monte a Pirâmide de Base Quadrada',
    accentHex: '#F59E0B',
    secondaryHex: '#FDE68A',
  },
  {
    id: 'triangular_prism',
    solidId: 'triangular_prism',
    title: 'Arquiteto do Prisma',
    shortTitle: 'Prisma',
    description: 'Ergueu os 3 retângulos e fechou as 2 bases triangulares.',
    requirementText: 'Monte o Prisma de Base Triangular',
    accentHex: '#10B981',
    secondaryHex: '#6EE7B7',
  },
  {
    id: 'rectangular_box',
    solidId: 'rectangular_box',
    title: 'Mestre do Bloco',
    shortTitle: 'Paralelepípedo',
    description: 'Dobrou os 3 pares de retângulos iguais do Paralelepípedo.',
    requirementText: 'Monte o Paralelepípedo',
    accentHex: '#0EA5E9',
    secondaryHex: '#7DD3FC',
  },
  {
    id: 'tetrahedron',
    solidId: 'tetrahedron',
    title: 'Guardião do Tetraedro',
    shortTitle: 'Tetraedro',
    description: 'Conectou os 4 triângulos equiláteros da pirâmide triangular.',
    requirementText: 'Monte o Tetraedro Regular',
    accentHex: '#8B5CF6',
    secondaryHex: '#C4B5FD',
  },
  {
    id: 'master_geometer',
    solidId: null,
    title: 'Mestre da Geometria 3D',
    shortTitle: 'Mestre 3D',
    description: 'Completou a montagem de todos os 5 sólidos geométricos!',
    requirementText: 'Desbloqueie todas as 5 medalhas de sólidos',
    accentHex: '#FACC15',
    secondaryHex: '#FEF08A',
    isMaster: true,
  },
];

export const SOLID_MEDAL_IDS: MedalId[] = [
  'cube_cross',
  'square_pyramid',
  'triangular_prism',
  'rectangular_box',
  'tetrahedron',
];

export function getMedalById(id: MedalId): MedalSpec | undefined {
  return MEDALS.find((m) => m.id === id);
}
