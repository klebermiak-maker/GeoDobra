import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Box,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  HelpCircle,
  Layers,
  Lock,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  FaceNodeSpec,
  GEOMETRIC_SOLIDS,
  GeometricSolidSpec,
  MaterialFinishId,
} from './data/geometricSolids';
import {
  MEDALS,
  MedalId,
  MedalSpec,
  SOLID_MEDAL_IDS,
  getMedalById,
} from './data/medals';
import { MedalArtwork } from './components/MedalArtwork';
import { MedalUnlockToast } from './components/MedalUnlockToast';
import {
  CameraPresetId,
  GeometricNetScene,
} from './three/GeometricNetScene';
import { soundFX } from './utils/soundEffects';

type LearningMode = 'explore' | 'mission' | 'detective' | 'medals' | 'guide';

const MEDALS_STORAGE_KEY = 'geodobra3d_unlocked_medals_v1';

function loadStoredMedals(): Partial<Record<MedalId, string>> {
  try {
    const raw = window.localStorage.getItem(MEDALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<Record<MedalId, string>>;
    }
  } catch {
    // Ignore storage read issues
  }
  return {};
}

// Collect all face specs from the hierarchical tree in order of labelNumber
function flattenFaces(root: FaceNodeSpec): FaceNodeSpec[] {
  const list: FaceNodeSpec[] = [];
  const walk = (node: FaceNodeSpec) => {
    list.push(node);
    if (node.children) {
      node.children.forEach(walk);
    }
  };
  walk(root);
  return list.sort((a, b) => a.labelNumber - b.labelNumber);
}

export default function App() {
  const [selectedSolidId, setSelectedSolidId] = useState<string>(GEOMETRIC_SOLIDS[0].id);
  const [learningMode, setLearningMode] = useState<LearningMode>('explore');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [dockTab, setDockTab] = useState<'fold' | 'faces' | 'options'>('fold');

  const [materialFinish, setMaterialFinish] = useState<MaterialFinishId>('cardboard');
  const [showVerticesAndEdges, setShowVerticesAndEdges] = useState<boolean>(true);
  const [showEverydayObject, setShowEverydayObject] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric');
  const [muted, setMuted] = useState<boolean>(false);

  // Per-face normalized fold state (0 = flat on table, 1 = fully folded into 3D solid)
  const [faceAngles, setFaceAngles] = useState<Record<string, number>>({});
  const [selectedFace, setSelectedFace] = useState<FaceNodeSpec | null>(null);
  const [celebrationTrigger, setCelebrationTrigger] = useState<number>(0);

  // Detective mode quiz state
  const [quizQuestionIdx, setQuizQuestionIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);

  // Persistent Medal System state
  const [unlockedMedals, setUnlockedMedals] = useState<Partial<Record<MedalId, string>>>(() =>
    loadStoredMedals()
  );
  const [toastQueue, setToastQueue] = useState<MedalSpec[]>([]);

  // Persist unlocked medals to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(MEDALS_STORAGE_KEY, JSON.stringify(unlockedMedals));
    } catch {
      // Ignore storage write issues
    }
  }, [unlockedMedals]);

  // Auto-advance medal unlock toast notifications
  const activeToastMedal = toastQueue[0] ?? null;
  useEffect(() => {
    if (!activeToastMedal) return;
    const timer = window.setTimeout(() => {
      setToastQueue((prev) => prev.slice(1));
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [activeToastMedal]);

  const unlockedCount = useMemo(
    () => MEDALS.filter((m) => Boolean(unlockedMedals[m.id])).length,
    [unlockedMedals]
  );

  const unlockedSolidsCount = useMemo(
    () => SOLID_MEDAL_IDS.filter((id) => Boolean(unlockedMedals[id])).length,
    [unlockedMedals]
  );

  const activeSolid: GeometricSolidSpec = useMemo(
    () => GEOMETRIC_SOLIDS.find((s) => s.id === selectedSolidId) || GEOMETRIC_SOLIDS[0],
    [selectedSolidId]
  );

  const allFaces = useMemo(() => flattenFaces(activeSolid.rootFace), [activeSolid]);
  const movableFaces = useMemo(
    () => allFaces.filter((f) => f.maxFoldAngle > 0),
    [allFaces]
  );

  const wasFullyFoldedRef = React.useRef<boolean>(false);

  // Initialize all movable faces to 0 (flat net) when switching solid
  useEffect(() => {
    const initial: Record<string, number> = {};
    allFaces.forEach((f) => {
      initial[f.id] = 0;
    });
    wasFullyFoldedRef.current = false;
    setFaceAngles(initial);
    setSelectedFace(activeSolid.rootFace);
    setQuizQuestionIdx(0);
    setSelectedOptionIdx(null);
  }, [activeSolid, allFaces]);

  // Keyboard shortcut 'H' to toggle collapsible bottom dock (Cinema / Zen Mode)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Compute overall fold progress (0..100%) across all movable faces
  const overallProgress = useMemo(() => {
    if (movableFaces.length === 0) return 0;
    const sum = movableFaces.reduce((acc, f) => acc + (faceAngles[f.id] ?? 0), 0);
    return sum / movableFaces.length;
  }, [movableFaces, faceAngles]);

  const isFullyFolded = useMemo(
    () =>
      movableFaces.length > 0 &&
      movableFaces.every((f) => (faceAngles[f.id] ?? 0) >= 0.98),
    [movableFaces, faceAngles]
  );

  // Detect transition from open -> 100% closed to celebrate and unlock medals cleanly
  useEffect(() => {
    if (isFullyFolded && !wasFullyFoldedRef.current) {
      wasFullyFoldedRef.current = true;
      setCelebrationTrigger((c) => c + 1);

      const solidMedalId = activeSolid.id as MedalId;
      const alreadyUnlocked = Boolean(unlockedMedals[solidMedalId]);

      if (!alreadyUnlocked) {
        const nowIso = new Date().toISOString();
        const newlyEarned: MedalSpec[] = [];
        const solidMedal = getMedalById(solidMedalId);
        if (solidMedal) newlyEarned.push(solidMedal);

        const nextMap: Partial<Record<MedalId, string>> = {
          ...unlockedMedals,
          [solidMedalId]: nowIso,
        };

        const allFiveDone = SOLID_MEDAL_IDS.every((id) => Boolean(nextMap[id]));
        const unlockedMasterNow = allFiveDone && !nextMap.master_geometer;
        if (unlockedMasterNow) {
          nextMap.master_geometer = nowIso;
          const masterMedal = getMedalById('master_geometer');
          if (masterMedal) newlyEarned.push(masterMedal);
        }

        setUnlockedMedals(nextMap);
        setToastQueue((prev) => [...prev, ...newlyEarned]);
        soundFX.playMedalUnlock(unlockedMasterNow);
      } else {
        soundFX.playSolidComplete();
      }
    } else if (!isFullyFolded) {
      wasFullyFoldedRef.current = false;
    }
  }, [isFullyFolded, activeSolid.id, unlockedMedals]);

  const handleResetMedals = () => {
    setUnlockedMedals({});
    setToastQueue([]);
  };

  const handleFaceAngleChange = useCallback(
    (faceId: string, newNormalized: number) => {
      setFaceAngles((prev) => ({ ...prev, [faceId]: newNormalized }));
    },
    []
  );

  const handleFaceToggle = useCallback((faceId: string) => {
    setFaceAngles((prev) => {
      const curr = prev[faceId] ?? 0;
      const target = curr >= 0.5 ? 0 : 1;
      return { ...prev, [faceId]: target };
    });
  }, []);

  const handleMasterFoldAll = useCallback(
    (targetValue: number) => {
      const next: Record<string, number> = {};
      allFaces.forEach((f) => {
        next[f.id] = f.maxFoldAngle > 0 ? targetValue : 0;
      });
      setFaceAngles(next);
    },
    [allFaces]
  );

  const handleToggleMasterFold = useCallback(() => {
    const nextVal = isFullyFolded ? 0 : 1;
    if (nextVal === 0) {
      soundFX.playFaceSnap();
    }
    handleMasterFoldAll(nextVal);
  }, [isFullyFolded, handleMasterFoldAll]);

  const handleToggleMute = () => {
    const nextMuted = !muted;
    soundFX.muted = nextMuted;
    setMuted(nextMuted);
  };

  const activeQuestion = activeSolid.questions[quizQuestionIdx] || activeSolid.questions[0];

  const handleAnswerOption = (idx: number) => {
    setSelectedOptionIdx(idx);
    const isCorrect = idx === activeQuestion.correctIndex;
    soundFX.playQuizResult(isCorrect);
    if (isCorrect) {
      setQuizScore((s) => s + 10);
      setCelebrationTrigger((c) => c + 1);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none text-slate-100">
      {/* Full-Bleed 3D WebGL Scene (100vw x 100vh) */}
      <GeometricNetScene
        solid={activeSolid}
        faceAngles={faceAngles}
        onFaceAngleChange={handleFaceAngleChange}
        onFaceToggle={handleFaceToggle}
        onSelectFace={setSelectedFace}
        selectedFaceId={selectedFace?.id ?? null}
        materialFinish={materialFinish}
        showVerticesAndEdges={showVerticesAndEdges}
        showEverydayObject={showEverydayObject}
        cameraPreset={cameraPreset}
        onCameraPresetSettled={() => {}}
        celebrationTrigger={celebrationTrigger}
      />

      {/* Top Bar Contract: 1-Row, 3-Zone Header (Brand — 4 Nav Links — 1 Primary Action) */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/95 border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setLearningMode('explore');
          }}
          className="font-display text-lg font-bold tracking-tight text-amber-400 whitespace-nowrap shrink-0"
        >
          GeoDobra 3D
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => {
              setLearningMode('explore');
              setDockCollapsed(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              learningMode === 'explore'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-white hover:border-slate-600'
            }`}
          >
            Explorar Livre
          </button>
          <button
            type="button"
            onClick={() => {
              setLearningMode('mission');
              setDockCollapsed(false);
              handleMasterFoldAll(0);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              learningMode === 'mission'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-white hover:border-slate-600'
            }`}
          >
            Missão Montar
          </button>
          <button
            type="button"
            onClick={() => {
              setLearningMode('detective');
              setDockCollapsed(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              learningMode === 'detective'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-white hover:border-slate-600'
            }`}
          >
            Desafio Detetive
          </button>
          <button
            type="button"
            onClick={() => {
              setLearningMode('medals');
              setDockCollapsed(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              learningMode === 'medals'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-white hover:border-slate-600'
            }`}
          >
            Medalhas ({unlockedCount}/{MEDALS.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setLearningMode('guide');
              setDockCollapsed(false);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              learningMode === 'guide'
                ? 'text-white border-amber-400'
                : 'border-transparent hover:text-white hover:border-slate-600'
            }`}
          >
            Guia 3º Ano
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleToggleMasterFold}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFullyFolded ? 'Planificar Sólido (2D)' : 'Fechar Sólido (3D)'}
          </button>
        </div>
      </header>

      {/* Top-Left Minimal Spec & Instruction Strip (Unboxed zero-pill metadata, non-obstructive) */}
      <div className="fixed top-16 left-6 z-10 pointer-events-none max-w-xl">
        <h1 className="font-display text-xl font-bold text-white tracking-tight">
          {activeSolid.name}
        </h1>
        {/* Unboxed inline metadata with typographic separators */}
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300 font-mono-tabular">
          <span>{activeSolid.stats.faces} Faces</span>
          <span aria-hidden="true">·</span>
          <span>{activeSolid.stats.edges} Arestas</span>
          <span aria-hidden="true">·</span>
          <span>{activeSolid.stats.vertices} Vértices</span>
          <span aria-hidden="true">·</span>
          <span className="font-sans text-amber-300">{activeSolid.stats.faceShapesSummary}</span>
          <span aria-hidden="true">·</span>
          <span className="font-sans text-emerald-300">
            Objeto: {activeSolid.everydayObjectName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-sans text-sky-300">
            Medalha:{' '}
            {unlockedMedals[activeSolid.id as MedalId] ? 'Conquistada ✓' : 'A desbloquear'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-300">
          Dica 3D: Clique ou arraste qualquer face colorida na bancada para dobrar sua dobradiça.
        </p>
      </div>

      {/* Celebratory Medal Unlock Toast */}
      <MedalUnlockToast
        medal={activeToastMedal}
        onDismiss={() => setToastQueue((prev) => prev.slice(1))}
        onOpenMedals={() => {
          setToastQueue([]);
          setLearningMode('medals');
          setDockCollapsed(false);
        }}
      />

      {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Clutter, solid rgba surface) */}
      <section
        aria-label="Painel de Controles de Planificação 3D"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px] transition-transform duration-200 ease-out"
        style={{
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Toggle Tab attached to top center of bottom dock */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((c) => !c)}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900/95 border border-b-0 border-slate-700 rounded-t-lg hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Mostrar Controles (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Ocultar Controles (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Body (Solid dark surface without backdrop-filter to preserve 60fps WebGL) */}
        <div className="bg-slate-900/96 border border-slate-700/90 rounded-xl p-4 shadow-2xl">
          {/* Row 1: Solid Selector Segmented Bar + Audio / Reset utilities */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Escolher sólido geométrico">
              {GEOMETRIC_SOLIDS.map((solid) => {
                const isSelected = solid.id === activeSolid.id;
                const isDone = Boolean(unlockedMedals[solid.id as MedalId]);
                return (
                  <button
                    key={solid.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedSolidId(solid.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 shrink-0" />
                    <span>{solid.shortName}</span>
                    {isDone && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-slate-950' : 'text-emerald-400'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-navigation for Dock Panels in Explore mode */}
            <div className="flex items-center gap-1.5">
              {learningMode === 'explore' && (
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDockTab('fold')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      dockTab === 'fold'
                        ? 'bg-slate-800 text-amber-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dobrar Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockTab('faces')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      dockTab === 'faces'
                        ? 'bg-slate-800 text-amber-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Faces ({allFaces.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockTab('options')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      dockTab === 'options'
                        ? 'bg-slate-800 text-amber-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Câmera e Material
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleMasterFoldAll(0)}
                title="Abrir todas as faces na mesa"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Abrir Tudo</span>
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={muted ? 'Ativar sons' : 'Silenciar sons'}
                className="p-1.5 text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Row 2: Dynamic Mode Content */}
          {learningMode === 'explore' && dockTab === 'fold' && (
            <div className="pt-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Master Fold Slider with explicit label, numeric value, and unit */}
              <div className="md:col-span-7 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="master-fold-slider" className="font-semibold text-slate-200">
                    Controle Geral de Dobradura (Planificação 2D → Sólido 3D)
                  </label>
                  <span className="font-mono-tabular font-bold text-amber-400">
                    {Math.round(overallProgress * 100)}% dobrado
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    0% Aberto
                  </span>
                  <input
                    id="master-fold-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(overallProgress * 100)}
                    onChange={(e) => {
                      const val = Number(e.target.value) / 100;
                      handleMasterFoldAll(val);
                    }}
                    className="fold-slider w-full"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    100% Fechado
                  </span>
                </div>
              </div>

              {/* Quick Individual Face Toggle Buttons */}
              <div className="md:col-span-5 flex flex-col gap-1.5">
                <div className="text-xs font-medium text-slate-300">
                  Clique para dobrar cada face individualmente:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {allFaces.map((face) => {
                    const isBase = face.maxFoldAngle === 0;
                    const norm = faceAngles[face.id] ?? 0;
                    const isFolded = norm >= 0.5;
                    return (
                      <button
                        key={face.id}
                        type="button"
                        onClick={() => {
                          setSelectedFace(face);
                          if (!isBase) {
                            handleFaceToggle(face.id);
                            soundFX.playFaceSnap();
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isBase
                            ? 'bg-slate-800/90 border-slate-700 text-slate-300'
                            : isFolded
                            ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200'
                            : 'bg-slate-800 border-slate-600 text-white hover:border-amber-400'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: face.colorHex }}
                        />
                        <span>Face {face.labelNumber}</span>
                        <span className="font-mono-tabular text-[11px] text-slate-400">
                          {isBase ? 'Base' : `${Math.round(norm * 100)}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {learningMode === 'explore' && dockTab === 'faces' && (
            <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {allFaces.map((face) => {
                const isBase = face.maxFoldAngle === 0;
                const norm = faceAngles[face.id] ?? 0;
                const deg = Math.round(
                  (norm * face.maxFoldAngle * 180) / Math.PI
                );
                return (
                  <div
                    key={face.id}
                    onClick={() => setSelectedFace(face)}
                    className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      selectedFace?.id === face.id
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: face.colorHex }}
                        />
                        <span>Face {face.labelNumber}</span>
                      </span>
                      <span className="font-mono-tabular text-amber-300">
                        {isBase ? 'Fixa' : `${deg}°`}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 truncate">
                      {face.title}
                    </div>
                    {!isBase ? (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        aria-label={`Ângulo da Face ${face.labelNumber}`}
                        value={Math.round(norm * 100)}
                        onChange={(e) => {
                          handleFaceAngleChange(face.id, Number(e.target.value) / 100);
                        }}
                        className="fold-slider w-full mt-2"
                      />
                    ) : (
                      <div className="mt-2 text-[11px] text-slate-400">
                        Apoiada na mesa
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {learningMode === 'explore' && dockTab === 'options' && (
            <div className="pt-3 flex flex-wrap items-center justify-between gap-4">
              {/* Material Finish Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Material:</span>
                </span>
                {(
                  [
                    ['cardboard', 'Papel Cartão'],
                    ['wood', 'Madeira'],
                    ['acrylic', 'Acrílico Cristal'],
                  ] as [MaterialFinishId, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMaterialFinish(id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      materialFinish === id
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Camera Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Câmera:</span>
                </span>
                {(
                  [
                    ['isometric', '3D Isométrica'],
                    ['top_plan', 'Vista de Topo (Planta)'],
                    ['front_eye', 'Vista Frontal'],
                  ] as [CameraPresetId, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCameraPreset(id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      cameraPreset === id
                        ? 'bg-sky-400 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Educational Visual Helpers */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVerticesAndEdges((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showVerticesAndEdges
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Vértices e Arestas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEverydayObject((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showEverydayObject
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Objeto do Dia a Dia</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Missão Montar (Interactive Folding Mission for 3rd Graders) */}
          {learningMode === 'mission' && (
            <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    Missão Mão na Massa: Dobre todas as {movableFaces.length} faces móveis na cena 3D!
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {isFullyFolded
                    ? `Parabéns! Você montou o ${activeSolid.shortName} com ${activeSolid.stats.faces} faces, ${activeSolid.stats.edges} arestas e ${activeSolid.stats.vertices} vértices!`
                    : `Arraste cada face para cima com o mouse (ou clique nelas) até fechar o sólido geométrico completo.`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {allFaces.map((face) => {
                  const isBase = face.maxFoldAngle === 0;
                  const closed = isBase || (faceAngles[face.id] ?? 0) >= 0.95;
                  return (
                    <button
                      key={face.id}
                      type="button"
                      onClick={() => {
                        if (!isBase) {
                          handleFaceToggle(face.id);
                          soundFX.playFaceSnap();
                        }
                      }}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        closed
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                          : 'bg-slate-800 border-slate-600 text-slate-200 hover:border-amber-400'
                      }`}
                    >
                      Face {face.labelNumber}: {closed ? 'Pronta ✓' : 'Dobrar'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 3: Desafio Detetive (3rd-grade Spatial Reasoning Quiz) */}
          {learningMode === 'detective' && activeQuestion && (
            <div className="pt-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{activeQuestion.prompt}</span>
                </div>
                <span className="text-xs font-mono-tabular text-emerald-300 whitespace-nowrap shrink-0">
                  Pontos: {quizScore}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeQuestion.options.map((option, idx) => {
                  const isChosen = selectedOptionIdx === idx;
                  const isCorrect = idx === activeQuestion.correctIndex;
                  let btnStyle =
                    'bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-400';
                  if (selectedOptionIdx !== null) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-950 border-emerald-400 text-emerald-200';
                    } else if (isChosen) {
                      btnStyle = 'bg-rose-950 border-rose-400 text-rose-200';
                    }
                  }
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswerOption(idx)}
                      className={`px-3 py-2 text-xs font-semibold text-left rounded-lg border transition-colors cursor-pointer ${btnStyle}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {selectedOptionIdx !== null && (
                <div className="flex items-center justify-between gap-4 pt-1 text-xs text-slate-200">
                  <span>{activeQuestion.explanation}</span>
                  {activeSolid.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuizQuestionIdx((i) => (i + 1) % activeSolid.questions.length);
                        setSelectedOptionIdx(null);
                      }}
                      className="px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 rounded-md hover:bg-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Próxima Pergunta →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode 4: Quadro de Medalhas (Achievement Badges Gallery) */}
          {learningMode === 'medals' && (
            <div className="pt-3 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">
                    Quadro de Medalhas Geométricas
                  </span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-amber-300">
                    {unlockedSolidsCount}/5 sólidos montados
                  </span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-emerald-300">
                    {unlockedCount}/{MEDALS.length} medalhas
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Compact completion progress bar */}
                  <div
                    className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={unlockedSolidsCount}
                    aria-valuemin={0}
                    aria-valuemax={5}
                    aria-label="Progresso de sólidos montados"
                  >
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${(unlockedSolidsCount / 5) * 100}%` }}
                    />
                  </div>

                  {unlockedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetMedals}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Zerar Medalhas
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {MEDALS.map((medal) => {
                  const isUnlocked = Boolean(unlockedMedals[medal.id]);
                  const isCurrentSolid = medal.solidId === activeSolid.id;

                  return (
                    <button
                      key={medal.id}
                      type="button"
                      onClick={() => {
                        if (medal.solidId) {
                          setSelectedSolidId(medal.solidId);
                          if (!isUnlocked) {
                            setLearningMode('mission');
                          }
                        }
                      }}
                      className={`flex flex-col items-center text-center p-2.5 rounded-lg border transition-colors ${
                        medal.solidId ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isUnlocked
                          ? medal.isMaster
                            ? 'bg-amber-950/60 border-amber-400'
                            : 'bg-slate-800/95 border-emerald-500/60 hover:border-amber-400'
                          : isCurrentSolid
                          ? 'bg-slate-950 border-slate-600 hover:border-amber-400'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <MedalArtwork medal={medal} unlocked={isUnlocked} size={46} />

                      <span
                        className={`mt-1.5 text-xs font-semibold leading-tight ${
                          isUnlocked ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {medal.title}
                      </span>

                      <span
                        className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${
                          isUnlocked ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Conquistada</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 shrink-0" />
                            <span>{medal.solidId ? 'Montar sólido' : 'Bloqueada'}</span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 5: Guia Pedagógico 3º Ano (BNCC EF03MA13 & EF03MA14) */}
          {learningMode === 'guide' && (
            <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-amber-300">
                  1. O que é Planificação? ({activeSolid.bnccCode})
                </div>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  Planificar é &ldquo;desmontar&rdquo; a casca de um sólido espacial (3D) até que todas as suas faces fiquem esticadas sobre a mesa plana (2D) sem se soltarem.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-emerald-300">
                  2. Objeto Real: {activeSolid.everydayObjectName}
                </div>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  {activeSolid.everydayObjectDescription}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="font-semibold text-sky-300">
                  3. Segredo do Sólido
                </div>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  {activeSolid.curiosity3rdGrade}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
