export type PolygonShapeType = 'square' | 'rectangle' | 'equilateral_triangle' | 'isosceles_triangle';

export type MaterialFinishId = 'cardboard' | 'wood' | 'acrylic';

export interface FaceNodeSpec {
  id: string;
  labelNumber: number;
  title: string; // e.g., "Base", "Topo", "Frente", "Lateral Esquerda"
  roleHint: string; // e.g., "Fica no topo quando fechado"
  symbol: 'star' | 'sun' | 'heart' | 'crown' | 'diamond' | 'clover';
  colorHex: string;
  shape: PolygonShapeType;
  width: number;
  height: number; // For triangles, height from base edge to apex
  // Hinge attachment relative to parent face's local frame (where parent sits on XZ plane)
  // For root face, hingePosition and hingeAxis are [0,0,0] and maxFoldAngle = 0
  hingePosition: [number, number, number];
  hingeAxis: [number, number, number]; // Normalized vector in parent's XZ plane
  // Local offset of this face's geometry center from its own hinge origin when flat (unfolded = 0 rad)
  faceCenterOffset: [number, number, number];
  // Local Y rotation applied inside face so its base aligns along the hinge axis
  localYaw: number;
  // Max fold angle in radians when 100% closed into a 3D solid
  maxFoldAngle: number;
  children?: FaceNodeSpec[];
}

export interface DetectiveQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  targetFoldState?: 'flat' | 'folded';
}

export interface GeometricSolidSpec {
  id: string;
  name: string;
  shortName: string;
  bnccCode: string;
  category: 'Poliedro Regular' | 'Prisma' | 'Pirâmide';
  everydayObjectName: string;
  everydayObjectDescription: string;
  curiosity3rdGrade: string;
  stats: {
    faces: number;
    edges: number;
    vertices: number;
    faceShapesSummary: string;
  };
  rootFace: FaceNodeSpec;
  questions: DetectiveQuestion[];
}

// Angles for exact 3D closure
const DEG_90 = Math.PI / 2;
// Square pyramid with base 2.0 and triangle height 1.8:
// cos(theta) = (base/2) / slantHeight = 1.0 / 1.8 => interior angle = acos(1/1.8) ≈ 56.25 deg
// Fold angle from flat plane (180 deg) = Math.PI - Math.acos(1.0 / 1.8)
const PYRAMID_FOLD_ANGLE = Math.PI - Math.acos(1.0 / 1.8);

// Regular tetrahedron with side 2.2:
// Dihedral angle of regular tetrahedron is acos(1/3) ≈ 70.53 deg
// Fold angle from flat plane = Math.PI - Math.acos(1 / 3) ≈ 109.47 deg
const TETRA_HEIGHT = 2.2 * (Math.sqrt(3) / 2);
const TETRA_FOLD_ANGLE = Math.PI - Math.acos(1 / 3);

// Triangular prism: 3 rectangular faces of width 1.8 x length 2.2, and 2 equilateral triangles of base 1.8
const TRI_PRISM_TRI_HEIGHT = 1.8 * (Math.sqrt(3) / 2);
const TRI_PRISM_SIDE_FOLD = (2 * Math.PI) / 3; // 120 deg fold from flat makes 60 deg interior triangle!

export const GEOMETRIC_SOLIDS: GeometricSolidSpec[] = [
  {
    id: 'cube_cross',
    name: 'Cubo (Planificação em Cruz)',
    shortName: 'Cubo (Cruz)',
    bnccCode: 'BNCC EF03MA13 · EF03MA14',
    category: 'Poliedro Regular',
    everydayObjectName: 'Caixa de Presente e Dado',
    everydayObjectDescription: 'O cubo tem 6 faces quadradas do mesmo tamanho, como um dado de tabuleiro ou uma caixa de presente quadrada.',
    curiosity3rdGrade: 'Dica de Detetive: Quando dobramos a cruz do cubo, a face nº 6 (Topo) dá duas dobras e fecha a caixa lá em cima!',
    stats: {
      faces: 6,
      edges: 12,
      vertices: 8,
      faceShapesSummary: '6 quadrados iguais',
    },
    rootFace: {
      id: 'cube_base',
      labelNumber: 1,
      title: 'Base (Fundo)',
      roleHint: 'Fica apoiada na mesa',
      symbol: 'star',
      colorHex: '#3B82F6', // Royal Blue
      shape: 'square',
      width: 1.7,
      height: 1.7,
      hingePosition: [0, 0, 0],
      hingeAxis: [1, 0, 0],
      faceCenterOffset: [0, 0, 0],
      localYaw: 0,
      maxFoldAngle: 0,
      children: [
        {
          id: 'cube_front',
          labelNumber: 2,
          title: 'Parede da Frente',
          roleHint: 'Dobra 90° para cima na frente',
          symbol: 'sun',
          colorHex: '#F59E0B', // Amber
          shape: 'square',
          width: 1.7,
          height: 1.7,
          hingePosition: [0, 0, 0.85],
          hingeAxis: [-1, 0, 0],
          faceCenterOffset: [0, 0, 0.85],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
        {
          id: 'cube_back',
          labelNumber: 3,
          title: 'Parede de Trás',
          roleHint: 'Dobra 90° para cima atrás e leva o Topo junto',
          symbol: 'heart',
          colorHex: '#10B981', // Emerald
          shape: 'square',
          width: 1.7,
          height: 1.7,
          hingePosition: [0, 0, -0.85],
          hingeAxis: [1, 0, 0],
          faceCenterOffset: [0, 0, -0.85],
          localYaw: 0,
          maxFoldAngle: DEG_90,
          children: [
            {
              id: 'cube_top',
              labelNumber: 6,
              title: 'Tampa (Topo)',
              roleHint: 'Fecha o alto do cubo, oposta à Base nº 1',
              symbol: 'crown',
              colorHex: '#EC4899', // Pink
              shape: 'square',
              width: 1.7,
              height: 1.7,
              hingePosition: [0, 0, -1.7],
              hingeAxis: [1, 0, 0],
              faceCenterOffset: [0, 0, -0.85],
              localYaw: 0,
              maxFoldAngle: DEG_90,
            },
          ],
        },
        {
          id: 'cube_left',
          labelNumber: 4,
          title: 'Lateral Esquerda',
          roleHint: 'Fecha o lado esquerdo do cubo',
          symbol: 'diamond',
          colorHex: '#8B5CF6', // Violet
          shape: 'square',
          width: 1.7,
          height: 1.7,
          hingePosition: [-0.85, 0, 0],
          hingeAxis: [0, 0, -1],
          faceCenterOffset: [-0.85, 0, 0],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
        {
          id: 'cube_right',
          labelNumber: 5,
          title: 'Lateral Direita',
          roleHint: 'Fecha o lado direito do cubo',
          symbol: 'clover',
          colorHex: '#06B6D4', // Cyan
          shape: 'square',
          width: 1.7,
          height: 1.7,
          hingePosition: [0.85, 0, 0],
          hingeAxis: [0, 0, 1],
          faceCenterOffset: [0.85, 0, 0],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
      ],
    },
    questions: [
      {
        id: 'q_cube_1',
        prompt: 'Quando dobramos todas as faces do Cubo, qual face fica lá em cima servindo como Tampa (oposta à Base nº 1)?',
        options: ['A face nº 6 (Coroa Rosa)', 'A face nº 2 (Sol Amarelo)', 'A face nº 4 (Diamante Roxo)'],
        correctIndex: 0,
        explanation: 'Isso mesmo! A face nº 6 está presa na parede de trás (nº 3). Quando as duas dobram 90°, a face 6 vira a tampa do cubo!',
      },
      {
        id: 'q_cube_2',
        prompt: 'Qual é o formato geométrico das 6 faces que formam a planificação do Cubo?',
        options: ['6 quadrados do mesmo tamanho', '4 triângulos e 2 quadrados', '6 círculos iguais'],
        correctIndex: 0,
        explanation: 'Perfeito! Todo cubo é formado por exatamente 6 faces quadradas iguais, 12 arestas e 8 vértices.',
      },
    ],
  },
  {
    id: 'square_pyramid',
    name: 'Pirâmide de Base Quadrada',
    shortName: 'Pirâmide Quadrada',
    bnccCode: 'BNCC EF03MA13 · EF03MA14',
    category: 'Pirâmide',
    everydayObjectName: 'Pirâmide do Egito',
    everydayObjectDescription: 'Tem 1 base quadrada apoiada no chão e 4 faces triangulares que se encontram em uma única ponta no alto (o ápice).',
    curiosity3rdGrade: 'Repare na planificação: ela parece uma estrela de 4 pontas! Quando os 4 triângulos sobem, suas pontas se juntam em 1 único vértice no topo.',
    stats: {
      faces: 5,
      edges: 8,
      vertices: 5,
      faceShapesSummary: '1 quadrado e 4 triângulos',
    },
    rootFace: {
      id: 'pyr_base',
      labelNumber: 1,
      title: 'Base Quadrada',
      roleHint: 'O único quadrado que fica apoiado no chão',
      symbol: 'star',
      colorHex: '#F59E0B',
      shape: 'square',
      width: 2.0,
      height: 2.0,
      hingePosition: [0, 0, 0],
      hingeAxis: [1, 0, 0],
      faceCenterOffset: [0, 0, 0],
      localYaw: 0,
      maxFoldAngle: 0,
      children: [
        {
          id: 'pyr_front',
          labelNumber: 2,
          title: 'Triângulo Frontal',
          roleHint: 'Inimigo do vento: inclina até o topo da pirâmide',
          symbol: 'sun',
          colorHex: '#EF4444',
          shape: 'isosceles_triangle',
          width: 2.0,
          height: 1.8,
          hingePosition: [0, 0, 1.0],
          hingeAxis: [-1, 0, 0],
          faceCenterOffset: [0, 0, 0],
          localYaw: 0,
          maxFoldAngle: PYRAMID_FOLD_ANGLE,
        },
        {
          id: 'pyr_back',
          labelNumber: 3,
          title: 'Triângulo Traseiro',
          roleHint: 'Sobe pela parte de trás até encontrar o topo',
          symbol: 'heart',
          colorHex: '#10B981',
          shape: 'isosceles_triangle',
          width: 2.0,
          height: 1.8,
          hingePosition: [0, 0, -1.0],
          hingeAxis: [1, 0, 0],
          faceCenterOffset: [0, 0, 0],
          localYaw: Math.PI,
          maxFoldAngle: PYRAMID_FOLD_ANGLE,
        },
        {
          id: 'pyr_left',
          labelNumber: 4,
          title: 'Triângulo Esquerdo',
          roleHint: 'Sobe pelo lado esquerdo até o vértice do topo',
          symbol: 'diamond',
          colorHex: '#3B82F6',
          shape: 'isosceles_triangle',
          width: 2.0,
          height: 1.8,
          hingePosition: [-1.0, 0, 0],
          hingeAxis: [0, 0, -1],
          faceCenterOffset: [0, 0, 0],
          localYaw: -Math.PI / 2,
          maxFoldAngle: PYRAMID_FOLD_ANGLE,
        },
        {
          id: 'pyr_right',
          labelNumber: 5,
          title: 'Triângulo Direito',
          roleHint: 'Sobe pelo lado direito até fechar a pirâmide',
          symbol: 'crown',
          colorHex: '#8B5CF6',
          shape: 'isosceles_triangle',
          width: 2.0,
          height: 1.8,
          hingePosition: [1.0, 0, 0],
          hingeAxis: [0, 0, 1],
          faceCenterOffset: [0, 0, 0],
          localYaw: Math.PI / 2,
          maxFoldAngle: PYRAMID_FOLD_ANGLE,
        },
      ],
    },
    questions: [
      {
        id: 'q_pyr_1',
        prompt: 'Quais figuras planas aparecem na planificação da Pirâmide de Base Quadrada?',
        options: ['1 quadrado no centro e 4 triângulos ao redor', '5 quadrados iguais', '2 triângulos e 3 retângulos'],
        correctIndex: 0,
        explanation: 'Muito bem! A base é 1 quadrado e as 4 paredes laterais são triângulos que se encontram na ponta lá no alto.',
      },
      {
        id: 'q_pyr_2',
        prompt: 'Quantos vértices (pontas) a Pirâmide de Base Quadrada tem depois que fechamos todas as faces?',
        options: ['5 vértices (4 na base e 1 no topo)', '8 vértices iguais ao cubo', '3 vértices'],
        correctIndex: 0,
        explanation: 'Exato! São 4 cantinhos na base quadrada mais 1 ponta lá no alto onde os 4 triângulos se juntam: 4 + 1 = 5 vértices!',
      },
    ],
  },
  {
    id: 'triangular_prism',
    name: 'Prisma de Base Triangular',
    shortName: 'Prisma Triangular',
    bnccCode: 'BNCC EF03MA13 · EF03MA14',
    category: 'Prisma',
    everydayObjectName: 'Barraca de Acampamento',
    everydayObjectDescription: 'Parece uma barraca de acampamento ou o telhado de uma casa! Tem 3 faces retangulares compridas e 2 portas triangulares.',
    curiosity3rdGrade: 'Diferente da pirâmide, o Prisma Triangular tem duas bases triangulares (frente e trás) e 3 paredes retangulares!',
    stats: {
      faces: 5,
      edges: 9,
      vertices: 6,
      faceShapesSummary: '3 retângulos e 2 triângulos',
    },
    rootFace: {
      id: 'prism_base',
      labelNumber: 1,
      title: 'Piso da Barraca (Retângulo)',
      roleHint: 'Retângulo central apoiado no chão',
      symbol: 'star',
      colorHex: '#10B981',
      shape: 'rectangle',
      width: 1.8,
      height: 2.2,
      hingePosition: [0, 0, 0],
      hingeAxis: [1, 0, 0],
      faceCenterOffset: [0, 0, 0],
      localYaw: 0,
      maxFoldAngle: 0,
      children: [
        {
          id: 'prism_left_roof',
          labelNumber: 2,
          title: 'Telhado Esquerdo (Retângulo)',
          roleHint: 'Inclina para formar o lado esquerdo do telhado',
          symbol: 'sun',
          colorHex: '#3B82F6',
          shape: 'rectangle',
          width: 1.8,
          height: 2.2,
          hingePosition: [-0.9, 0, 0],
          hingeAxis: [0, 0, -1],
          faceCenterOffset: [-0.9, 0, 0],
          localYaw: 0,
          maxFoldAngle: TRI_PRISM_SIDE_FOLD,
        },
        {
          id: 'prism_right_roof',
          labelNumber: 3,
          title: 'Telhado Direito (Retângulo)',
          roleHint: 'Inclina para encontrar o telhado esquerdo',
          symbol: 'crown',
          colorHex: '#06B6D4',
          shape: 'rectangle',
          width: 1.8,
          height: 2.2,
          hingePosition: [0.9, 0, 0],
          hingeAxis: [0, 0, 1],
          faceCenterOffset: [0.9, 0, 0],
          localYaw: 0,
          maxFoldAngle: TRI_PRISM_SIDE_FOLD,
        },
        {
          id: 'prism_front_tri',
          labelNumber: 4,
          title: 'Entrada Frontal (Triângulo)',
          roleHint: 'Levanta 90° para fechar a frente da barraca',
          symbol: 'heart',
          colorHex: '#F59E0B',
          shape: 'isosceles_triangle',
          width: 1.8,
          height: TRI_PRISM_TRI_HEIGHT,
          hingePosition: [0, 0, 1.1],
          hingeAxis: [-1, 0, 0],
          faceCenterOffset: [0, 0, 0],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
        {
          id: 'prism_back_tri',
          labelNumber: 5,
          title: 'Fundo Traseiro (Triângulo)',
          roleHint: 'Levanta 90° para fechar a parte de trás',
          symbol: 'diamond',
          colorHex: '#EC4899',
          shape: 'isosceles_triangle',
          width: 1.8,
          height: TRI_PRISM_TRI_HEIGHT,
          hingePosition: [0, 0, -1.1],
          hingeAxis: [1, 0, 0],
          faceCenterOffset: [0, 0, 0],
          localYaw: Math.PI,
          maxFoldAngle: DEG_90,
        },
      ],
    },
    questions: [
      {
        id: 'q_prism_1',
        prompt: 'A Pirâmide Quadrada e o Prisma Triangular têm 5 faces cada um. Como você diferencia a planificação do Prisma Triangular?',
        options: [
          'O Prisma Triangular tem 3 retângulos e apenas 2 triângulos',
          'O Prisma Triangular só tem quadrados',
          'O Prisma Triangular tem 4 triângulos e 1 quadrado',
        ],
        correctIndex: 0,
        explanation: 'Olho de detetive! O Prisma Triangular parece uma barraca: 3 retângulos compridos (chão e telhados) e 2 portas triangulares.',
      },
    ],
  },
  {
    id: 'rectangular_box',
    name: 'Paralelepípedo (Bloco Retangular)',
    shortName: 'Paralelepípedo',
    bnccCode: 'BNCC EF03MA13 · EF03MA14',
    category: 'Prisma',
    everydayObjectName: 'Caixa de Sapato e Livro',
    everydayObjectDescription: 'Muito parecido com o cubo, mas suas faces são retângulos compridos! É o formato da caixa de sapatos, da caixa de leite e do tijolo.',
    curiosity3rdGrade: 'Observe que as faces opostas (como o fundo e a tampa, ou as duas laterais) têm sempre exatamente a mesma medida!',
    stats: {
      faces: 6,
      edges: 12,
      vertices: 8,
      faceShapesSummary: '6 faces retangulares (em 3 pares iguais)',
    },
    rootFace: {
      id: 'box_base',
      labelNumber: 1,
      title: 'Base Retangular',
      roleHint: 'Fundo comprido da caixa de sapatos',
      symbol: 'star',
      colorHex: '#0EA5E9',
      shape: 'rectangle',
      width: 2.3,
      height: 1.5,
      hingePosition: [0, 0, 0],
      hingeAxis: [1, 0, 0],
      faceCenterOffset: [0, 0, 0],
      localYaw: 0,
      maxFoldAngle: 0,
      children: [
        {
          id: 'box_front',
          labelNumber: 2,
          title: 'Lateral Frontal',
          roleHint: 'Sobe 90° na frente da caixa',
          symbol: 'sun',
          colorHex: '#F97316',
          shape: 'rectangle',
          width: 2.3,
          height: 1.1,
          hingePosition: [0, 0, 0.75],
          hingeAxis: [-1, 0, 0],
          faceCenterOffset: [0, 0, 0.55],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
        {
          id: 'box_back',
          labelNumber: 3,
          title: 'Lateral Traseira',
          roleHint: 'Sobe 90° atrás e sustenta a tampa grande',
          symbol: 'heart',
          colorHex: '#10B981',
          shape: 'rectangle',
          width: 2.3,
          height: 1.1,
          hingePosition: [0, 0, -0.75],
          hingeAxis: [1, 0, 0],
          faceCenterOffset: [0, 0, -0.55],
          localYaw: 0,
          maxFoldAngle: DEG_90,
          children: [
            {
              id: 'box_top',
              labelNumber: 6,
              title: 'Tampa Grande',
              roleHint: 'Tem o mesmo tamanho da Base nº 1',
              symbol: 'crown',
              colorHex: '#EC4899',
              shape: 'rectangle',
              width: 2.3,
              height: 1.5,
              hingePosition: [0, 0, -1.1],
              hingeAxis: [1, 0, 0],
              faceCenterOffset: [0, 0, -0.75],
              localYaw: 0,
              maxFoldAngle: DEG_90,
            },
          ],
        },
        {
          id: 'box_left',
          labelNumber: 4,
          title: 'Aba Esquerda',
          roleHint: 'Fecha a ponta esquerda da caixa',
          symbol: 'diamond',
          colorHex: '#8B5CF6',
          shape: 'rectangle',
          width: 1.1,
          height: 1.5,
          hingePosition: [-1.15, 0, 0],
          hingeAxis: [0, 0, -1],
          faceCenterOffset: [-0.55, 0, 0],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
        {
          id: 'box_right',
          labelNumber: 5,
          title: 'Aba Direita',
          roleHint: 'Fecha a ponta direita da caixa',
          symbol: 'clover',
          colorHex: '#EAB308',
          shape: 'rectangle',
          width: 1.1,
          height: 1.5,
          hingePosition: [1.15, 0, 0],
          hingeAxis: [0, 0, 1],
          faceCenterOffset: [0.55, 0, 0],
          localYaw: 0,
          maxFoldAngle: DEG_90,
        },
      ],
    },
    questions: [
      {
        id: 'q_box_1',
        prompt: 'Qual objeto da nossa sala de aula ou casa tem o formato de um Paralelepípedo (Bloco Retangular)?',
        options: ['Uma caixa de sapatos ou um livro', 'Uma bola de futebol', 'Um chapéu de aniversário em cone'],
        correctIndex: 0,
        explanation: 'Isso mesmo! A caixa de sapatos, o tijolo e o livro são blocos retangulares com 6 faces, 12 arestas e 8 vértices.',
      },
    ],
  },
  {
    id: 'tetrahedron',
    name: 'Tetraedro Regular (Pirâmide Triangular)',
    shortName: 'Tetraedro',
    bnccCode: 'BNCC EF03MA13 · EF03MA14',
    category: 'Pirâmide',
    everydayObjectName: 'Pirâmide de 4 Triângulos',
    everydayObjectDescription: 'O sólido mais simples de todos! Tanto a base quanto as 3 laterais são triângulos equiláteros (com os 3 lados iguais).',
    curiosity3rdGrade: 'Quando aberto na mesa, os 4 triângulos pequenos formam 1 triângulo gigante!',
    stats: {
      faces: 4,
      edges: 6,
      vertices: 4,
      faceShapesSummary: '4 triângulos equiláteros iguais',
    },
    rootFace: {
      id: 'tetra_base',
      labelNumber: 1,
      title: 'Base Triangular Central',
      roleHint: 'Triângulo central apoiado na bancada',
      symbol: 'star',
      colorHex: '#8B5CF6',
      shape: 'isosceles_triangle',
      width: 2.2,
      height: TETRA_HEIGHT,
      hingePosition: [0, 0, 0],
      hingeAxis: [1, 0, 0],
      faceCenterOffset: [0, 0, -TETRA_HEIGHT / 3],
      localYaw: 0,
      maxFoldAngle: 0,
      children: [
        {
          id: 'tetra_front',
          labelNumber: 2,
          title: 'Face Triangular Sul',
          roleHint: 'Dobra na aresta da frente para subir ao topo',
          symbol: 'sun',
          colorHex: '#F59E0B',
          shape: 'isosceles_triangle',
          width: 2.2,
          height: TETRA_HEIGHT,
          hingePosition: [0, 0, -TETRA_HEIGHT / 3],
          hingeAxis: [1, 0, 0],
          faceCenterOffset: [0, 0, 0],
          localYaw: Math.PI,
          maxFoldAngle: TETRA_FOLD_ANGLE,
        },
        {
          id: 'tetra_left',
          labelNumber: 3,
          title: 'Face Triangular Noroeste',
          roleHint: 'Dobra pela lateral esquerda até o vértice superior',
          symbol: 'heart',
          colorHex: '#10B981',
          shape: 'isosceles_triangle',
          width: 2.2,
          height: TETRA_HEIGHT,
          hingePosition: [-0.55, 0, TETRA_HEIGHT / 6],
          hingeAxis: [-0.5, 0, -Math.sqrt(3) / 2],
          faceCenterOffset: [0, 0, 0],
          localYaw: -Math.PI / 3,
          maxFoldAngle: TETRA_FOLD_ANGLE,
        },
        {
          id: 'tetra_right',
          labelNumber: 4,
          title: 'Face Triangular Nordeste',
          roleHint: 'Dobra pela lateral direita para fechar os 4 triângulos',
          symbol: 'crown',
          colorHex: '#EC4899',
          shape: 'isosceles_triangle',
          width: 2.2,
          height: TETRA_HEIGHT,
          hingePosition: [0.55, 0, TETRA_HEIGHT / 6],
          hingeAxis: [-0.5, 0, Math.sqrt(3) / 2],
          faceCenterOffset: [0, 0, 0],
          localYaw: Math.PI / 3,
          maxFoldAngle: TETRA_FOLD_ANGLE,
        },
      ],
    },
    questions: [
      {
        id: 'q_tetra_1',
        prompt: 'Quantas faces triangulares formam o Tetraedro Regular (Pirâmide de Base Triangular)?',
        options: ['4 triângulos iguais', '6 quadrados', '5 triângulos e 1 quadrado'],
        correctIndex: 0,
        explanation: 'Exatamente! "Tetra" significa quatro: são 4 faces triangulares, 6 arestas e 4 vértices.',
      },
    ],
  },
];
