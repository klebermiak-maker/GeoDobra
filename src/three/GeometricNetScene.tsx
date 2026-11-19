import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  FaceNodeSpec,
  GeometricSolidSpec,
  MaterialFinishId,
} from '../data/geometricSolids';
import {
  createFaceLabelTexture,
  createRoughnessNoiseTexture,
} from './proceduralTextures';
import {
  createCraftWorkbench,
  createEverydayObjectModel,
} from './workbenchProps';
import { soundFX } from '../utils/soundEffects';

export type CameraPresetId = 'isometric' | 'top_plan' | 'front_eye';

interface GeometricNetSceneProps {
  solid: GeometricSolidSpec;
  faceAngles: Record<string, number>; // 0..1 normalized fold per face ID
  onFaceAngleChange: (faceId: string, newNormalized: number, includeChildren?: boolean) => void;
  onFaceToggle: (faceId: string) => void;
  onSelectFace: (face: FaceNodeSpec | null) => void;
  selectedFaceId: string | null;
  materialFinish: MaterialFinishId;
  showVerticesAndEdges: boolean;
  showEverydayObject: boolean;
  cameraPreset: CameraPresetId;
  onCameraPresetSettled: () => void;
  celebrationTrigger: number;
}

interface RuntimeFaceController {
  spec: FaceNodeSpec;
  hingeGroup: THREE.Group;
  tileMesh: THREE.Mesh;
  outlineLines: THREE.LineSegments;
  vertexGroup: THREE.Group;
  hingePinGroup: THREE.Group;
  axisVec: THREE.Vector3;
  currentNormalized: number;
}

// Pre-allocated module-scope math objects for Zero-GC render loop
const _raycaster = new THREE.Raycaster();
const _pointerNDC = new THREE.Vector2();
const _scratchVec3 = new THREE.Vector3();
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();

// Detect software WebGL (SwiftShader, llvmpipe, softpipe, Basic Render) from GPU renderer string
const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

export const GeometricNetScene: React.FC<GeometricNetSceneProps> = ({
  solid,
  faceAngles,
  onFaceAngleChange,
  onFaceToggle,
  onSelectFace,
  selectedFaceId,
  materialFinish,
  showVerticesAndEdges,
  showEverydayObject,
  cameraPreset,
  onCameraPresetSettled,
  celebrationTrigger,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Mutable refs for event handlers inside stable WebGL lifecycle
  const faceAnglesRef = useRef<Record<string, number>>(faceAngles);
  faceAnglesRef.current = faceAngles;

  const onFaceAngleChangeRef = useRef(onFaceAngleChange);
  onFaceAngleChangeRef.current = onFaceAngleChange;

  const onFaceToggleRef = useRef(onFaceToggle);
  onFaceToggleRef.current = onFaceToggle;

  const onSelectFaceRef = useRef(onSelectFace);
  onSelectFaceRef.current = onSelectFace;

  const selectedFaceIdRef = useRef<string | null>(selectedFaceId);
  selectedFaceIdRef.current = selectedFaceId;

  // Scene object registries
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const netRootGroupRef = useRef<THREE.Group | null>(null);
  const everydayMountRef = useRef<THREE.Group | null>(null);
  const celebrationGroupRef = useRef<THREE.Group | null>(null);
  const controllersMapRef = useRef<Map<string, RuntimeFaceController>>(new Map());
  const clickableMeshesRef = useRef<THREE.Mesh[]>([]);
  const activeCameraTransitionRef = useRef<CameraPresetId | null>(null);

  // Trigger camera transition when cameraPreset prop changes
  useEffect(() => {
    activeCameraTransitionRef.current = cameraPreset;
  }, [cameraPreset]);

  // Main WebGL initialization (runs once on mount)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x0f172a);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.032);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 120);
    camera.position.set(0, 6.8, 7.6);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Mandatory studio environment map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting Rig
    // 1. Cool sky / warm ground HemisphereLight fill
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x78350f, 0.85);
    hemiLight.position.set(0, 18, 0);
    scene.add(hemiLight);

    // 2. Warm directional Key Light with tight shadow frustum
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(6.5, 11.5, 7.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 6.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 28;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // 3. Cool Rim / Backlight to separate geometric bevels from dark slate background
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-7, 6, -6.5);
    scene.add(rimLight);

    // Build procedural Classroom Craft Workbench
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const { workbenchGroup, everydayPropMount } = createCraftWorkbench(maxAnisotropy);
    scene.add(workbenchGroup);
    everydayMountRef.current = everydayPropMount;

    // Net root container
    const netRootGroup = new THREE.Group();
    netRootGroup.name = 'GeometricNetRoot';
    scene.add(netRootGroup);
    netRootGroupRef.current = netRootGroup;

    // Celebration 3D star burst container
    const celebrationGroup = new THREE.Group();
    celebrationGroup.visible = false;
    scene.add(celebrationGroup);
    celebrationGroupRef.current = celebrationGroup;

    // Create 18 composite 3D star particles for completion fanfare
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.16 : 0.07;
      const a = (i * Math.PI) / 5;
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 1,
    });
    const starColors = [0xf59e0b, 0x10b981, 0x38bdf8, 0xf472b6, 0xa855f7];
    for (let i = 0; i < 18; i++) {
      const starMat = new THREE.MeshStandardMaterial({
        color: starColors[i % starColors.length],
        roughness: 0.2,
        metalness: 0.8,
        emissive: starColors[i % starColors.length],
        emissiveIntensity: 0.35,
      });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      const angle = (i / 18) * Math.PI * 2;
      starMesh.userData = {
        baseAngle: angle,
        radius: 1.5 + (i % 3) * 0.45,
        speed: 1.5 + (i % 4) * 0.3,
        yOffset: 0.6 + (i % 3) * 0.5,
      };
      celebrationGroup.add(starMesh);
    }

    // OrbitControls with exponential damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Keep camera above workbench table
    controls.minDistance = 3.5;
    controls.maxDistance = 16;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // Cancel scripted camera transition if user manually rotates camera
    controls.addEventListener('start', () => {
      activeCameraTransitionRef.current = null;
    });

    // Pointer interaction for direct 3D face dragging & clicking
    const domElem = renderer.domElement;
    let draggingFaceId: string | null = null;
    let dragStartY = 0;
    let dragStartX = 0;
    let dragInitialAngle = 0;
    let pointerMovedDistance = 0;
    let hoveredFaceId: string | null = null;
    let lastHoverRaycastTime = 0;
    let lastSoundTickAngle = 0;

    const updatePointerNDC = (ev: PointerEvent) => {
      const rect = domElem.getBoundingClientRect();
      _pointerNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      updatePointerNDC(ev);
      _raycaster.setFromCamera(_pointerNDC, camera);
      const hits = _raycaster.intersectObjects(clickableMeshesRef.current, false);

      if (hits.length > 0) {
        const hitMesh = hits[0].object as THREE.Mesh;
        const faceId = hitMesh.userData.faceId as string;
        const ctrl = controllersMapRef.current.get(faceId);
        if (ctrl) {
          onSelectFaceRef.current(ctrl.spec);
          // Root face (labelNumber 1) stays anchored on the table; if clicked, select it
          if (ctrl.spec.maxFoldAngle > 0) {
            draggingFaceId = faceId;
            dragStartY = ev.clientY;
            dragStartX = ev.clientX;
            dragInitialAngle = faceAnglesRef.current[faceId] ?? 0;
            lastSoundTickAngle = dragInitialAngle;
            pointerMovedDistance = 0;
            controls.enabled = false;
            domElem.style.cursor = 'grabbing';
            domElem.setPointerCapture(ev.pointerId);
          }
        }
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (draggingFaceId) {
        const dy = dragStartY - ev.clientY; // Dragging UP folds the face upward (+dy)
        const dx = ev.clientX - dragStartX;
        pointerMovedDistance = Math.hypot(dx, dy);

        if (pointerMovedDistance > 5) {
          // 140px vertical drag = full 0..1 fold transition
          const deltaNorm = dy / 140;
          const nextNorm = THREE.MathUtils.clamp(dragInitialAngle + deltaNorm, 0, 1);
          onFaceAngleChangeRef.current(draggingFaceId, nextNorm, false);

          if (Math.abs(nextNorm - lastSoundTickAngle) >= 0.14) {
            soundFX.playFoldTick(nextNorm);
            lastSoundTickAngle = nextNorm;
          }
        }
        return;
      }

      // Throttled hover raycast (max 25Hz)
      const now = performance.now();
      if (now - lastHoverRaycastTime < 40) return;
      lastHoverRaycastTime = now;

      updatePointerNDC(ev);
      _raycaster.setFromCamera(_pointerNDC, camera);
      const hits = _raycaster.intersectObjects(clickableMeshesRef.current, false);

      const newHoverId = hits.length > 0 ? (hits[0].object.userData.faceId as string) : null;
      if (newHoverId !== hoveredFaceId) {
        // Restore previous hovered mesh emissive
        if (hoveredFaceId) {
          const prevCtrl = controllersMapRef.current.get(hoveredFaceId);
          if (prevCtrl) {
            const mat = prevCtrl.tileMesh.material as THREE.MeshPhysicalMaterial;
            const isSelected = selectedFaceIdRef.current === hoveredFaceId;
            mat.emissive.setHex(isSelected ? 0xf59e0b : 0x000000);
            mat.emissiveIntensity = isSelected ? 0.25 : 0;
          }
        }
        hoveredFaceId = newHoverId;
        if (hoveredFaceId) {
          const nextCtrl = controllersMapRef.current.get(hoveredFaceId);
          if (nextCtrl) {
            const mat = nextCtrl.tileMesh.material as THREE.MeshPhysicalMaterial;
            mat.emissive.setHex(0xfffbeb);
            mat.emissiveIntensity = 0.22;
            domElem.style.cursor = nextCtrl.spec.maxFoldAngle > 0 ? 'grab' : 'pointer';
          }
        } else {
          domElem.style.cursor = 'default';
        }
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!draggingFaceId) return;
      const finishedFaceId = draggingFaceId;
      draggingFaceId = null;
      controls.enabled = true;
      domElem.style.cursor = 'grab';
      try {
        domElem.releasePointerCapture(ev.pointerId);
      } catch {
        // Ignore if not captured
      }

      // If it was a quick click/tap (< 6px drag), toggle the face between 0% and 100%!
      if (pointerMovedDistance <= 6) {
        onFaceToggleRef.current(finishedFaceId);
        soundFX.playFaceSnap();
      } else {
        // Magnetic snap if within 8% of 0 or 1
        const currentVal = faceAnglesRef.current[finishedFaceId] ?? 0;
        if (currentVal > 0.92) {
          onFaceAngleChangeRef.current(finishedFaceId, 1, false);
          soundFX.playFaceSnap();
        } else if (currentVal < 0.08) {
          onFaceAngleChangeRef.current(finishedFaceId, 0, false);
          soundFX.playFaceSnap();
        }
      }
    };

    domElem.addEventListener('pointerdown', onPointerDown);
    domElem.addEventListener('pointermove', onPointerMove);
    domElem.addEventListener('pointerup', onPointerUp);

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Software WebGL fence-synced pacing helper
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // 1. Exponentially damp each face hinge rotation toward its target angle
      controllersMapRef.current.forEach((ctrl, id) => {
        const targetNorm = faceAnglesRef.current[id] ?? 0;
        ctrl.currentNormalized = THREE.MathUtils.damp(
          ctrl.currentNormalized,
          targetNorm,
          10,
          dt
        );
        const angleRad = ctrl.currentNormalized * ctrl.spec.maxFoldAngle;
        ctrl.hingeGroup.setRotationFromAxisAngle(ctrl.axisVec, angleRad);
      });

      // 2. Smoothly damp camera preset transitions if active
      if (activeCameraTransitionRef.current) {
        const preset = activeCameraTransitionRef.current;
        if (preset === 'isometric') {
          _camTargetPos.set(0, 6.8, 7.6);
          _camTargetLook.set(0, 0.45, 0);
        } else if (preset === 'top_plan') {
          _camTargetPos.set(0, 10.6, 0.01);
          _camTargetLook.set(0, 0, 0);
        } else {
          _camTargetPos.set(0, 2.6, 8.8);
          _camTargetLook.set(0, 0.75, 0);
        }

        const alpha = 1 - Math.exp(-6 * dt);
        camera.position.lerp(_camTargetPos, alpha);
        controls.target.lerp(_camTargetLook, alpha);

        if (camera.position.distanceTo(_camTargetPos) < 0.05) {
          activeCameraTransitionRef.current = null;
          onCameraPresetSettled();
        }
      }

      // 3. Animate celebration 3D stars when visible
      if (celebrationGroup.visible) {
        celebrationGroup.children.forEach((star) => {
          const { baseAngle, radius, speed, yOffset } = star.userData;
          const a = baseAngle + elapsed * speed;
          star.position.set(
            Math.cos(a) * radius,
            yOffset + Math.sin(elapsed * 3 + baseAngle) * 0.25,
            Math.sin(a) * radius
          );
          star.rotation.y = elapsed * 2.5;
          star.rotation.z = elapsed * 1.5;
        });
      }

      // 4. Gently rotate the everyday comparison object on its pedestal
      if (everydayMountRef.current && everydayMountRef.current.children.length > 0) {
        everydayMountRef.current.children[0].rotation.y = elapsed * 0.35;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('pointermove', onPointerMove);
      domElem.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Rebuild the hierarchical 3D geometric net and everyday comparison object whenever solid or finish changes
  useEffect(() => {
    const netRoot = netRootGroupRef.current;
    const renderer = rendererRef.current;
    const everydayMount = everydayMountRef.current;
    if (!netRoot || !renderer) return;

    // Clean up previous net meshes/geometries/materials
    netRoot.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    netRoot.clear();
    controllersMapRef.current.clear();
    clickableMeshesRef.current = [];

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const roughnessTex = createRoughnessNoiseTexture();

    const buildFaceHierarchy = (spec: FaceNodeSpec, parentGroup: THREE.Object3D) => {
      // 1. Hinge Pivot Group placed at the fold edge on the parent face
      const hingeGroup = new THREE.Group();
      hingeGroup.name = `Hinge_${spec.id}`;
      hingeGroup.position.set(
        spec.hingePosition[0],
        spec.hingePosition[1],
        spec.hingePosition[2]
      );
      parentGroup.add(hingeGroup);

      // 2. Face Content Group offset from the hinge so the polygon sits adjacent to the hinge line
      const faceContentGroup = new THREE.Group();
      faceContentGroup.position.set(
        spec.faceCenterOffset[0],
        spec.faceCenterOffset[1],
        spec.faceCenterOffset[2]
      );
      faceContentGroup.rotation.y = spec.localYaw;
      hingeGroup.add(faceContentGroup);

      // 3. Create 2D polygon shape for ExtrudeGeometry (beveled 3D tile)
      const tileThickness = 0.055;
      const shape2D = new THREE.Shape();
      const cornerPoints: [number, number][] = [];

      if (spec.shape === 'square' || spec.shape === 'rectangle') {
        const hw = spec.width / 2 - 0.015;
        const hh = spec.height / 2 - 0.015;
        shape2D.moveTo(-hw, -hh);
        shape2D.lineTo(hw, -hh);
        shape2D.lineTo(hw, hh);
        shape2D.lineTo(-hw, hh);
        shape2D.closePath();
        cornerPoints.push([-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]);
      } else {
        // Triangle with base along X at y2D = 0 and apex at y2D = +height
        const hw = spec.width / 2 - 0.015;
        const h = spec.height - 0.015;
        shape2D.moveTo(-hw, 0);
        shape2D.lineTo(hw, 0);
        shape2D.lineTo(0, h);
        shape2D.closePath();
        cornerPoints.push([-hw, 0], [hw, 0], [0, h]);
      }

      const extrudeGeo = new THREE.ExtrudeGeometry(shape2D, {
        depth: tileThickness,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 2,
      });
      // Rotate extruded XY shape onto the horizontal XZ plane
      // Wait: rotateX(+Math.PI / 2) maps shape (x, y, z) -> (x, -z, +y)!
      // That ensures y2D = +height maps to +Z in Three.js world coordinates!
      extrudeGeo.rotateX(Math.PI / 2);
      extrudeGeo.translate(0, tileThickness, 0);

      // Material finish styling (Papel Cartão Colorido, Madeira Educativa, Acrílico Cristal)
      const tileMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(spec.colorHex),
        roughness:
          materialFinish === 'cardboard'
            ? 0.62
            : materialFinish === 'wood'
            ? 0.45
            : 0.12,
        metalness: materialFinish === 'wood' ? 0.08 : 0.04,
        roughnessMap: materialFinish === 'acrylic' ? null : roughnessTex,
        clearcoat: materialFinish === 'acrylic' ? 1.0 : materialFinish === 'wood' ? 0.35 : 0.1,
        clearcoatRoughness: 0.15,
        transmission: materialFinish === 'acrylic' && !isSoftwareGl ? 0.55 : 0,
        transparent: materialFinish === 'acrylic',
        opacity: materialFinish === 'acrylic' ? 0.88 : 1.0,
      });

      const tileMesh = new THREE.Mesh(extrudeGeo, tileMat);
      tileMesh.castShadow = true;
      tileMesh.receiveShadow = true;
      tileMesh.userData = { faceId: spec.id };
      faceContentGroup.add(tileMesh);
      clickableMeshesRef.current.push(tileMesh);

      // 4. Printed Number & Symbol Medallion Decal on both top & underside of the face tile
      const labelTex = createFaceLabelTexture(spec, materialFinish, maxAnisotropy);
      const decalMat = new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: 0.5,
        metalness: 0.02,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });

      const decalShapeGeo = new THREE.ShapeGeometry(shape2D);
      // Normalize UVs of ShapeGeometry to 0..1 so the 512x512 medallion texture fits cleanly
      decalShapeGeo.computeBoundingBox();
      const bb = decalShapeGeo.boundingBox!;
      const uvAttr = decalShapeGeo.attributes.uv;
      const posAttr = decalShapeGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const u = (px - bb.min.x) / Math.max(0.001, bb.max.x - bb.min.x);
        const v = (py - bb.min.y) / Math.max(0.001, bb.max.y - bb.min.y);
        uvAttr.setXY(i, u, v);
      }
      uvAttr.needsUpdate = true;
      decalShapeGeo.rotateX(Math.PI / 2);

      // Top face label
      const topDecal = new THREE.Mesh(decalShapeGeo, decalMat);
      topDecal.position.y = tileThickness + 0.014;
      faceContentGroup.add(topDecal);

      // Bottom/outer face label (visible when folded into a 3D solid!)
      const bottomDecal = new THREE.Mesh(decalShapeGeo, decalMat);
      bottomDecal.position.y = -0.014;
      faceContentGroup.add(bottomDecal);

      // 5. Crisp geometric edge wireframe outline
      const edgesGeo = new THREE.EdgesGeometry(extrudeGeo, 25);
      const outlineLines = new THREE.LineSegments(
        edgesGeo,
        new THREE.LineBasicMaterial({
          color: showVerticesAndEdges ? 0xfef08a : 0xffffff,
          transparent: true,
          opacity: showVerticesAndEdges ? 0.95 : 0.35,
        })
      );
      faceContentGroup.add(outlineLines);

      // 6. Multi-part Vertex Spheres & Edge Highlight Bars (for counting Vértices & Arestas!)
      const vertexGroup = new THREE.Group();
      vertexGroup.visible = showVerticesAndEdges;
      const vertexSphereGeo = new THREE.SphereGeometry(0.085, 16, 16);
      const vertexSphereMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.2,
        metalness: 0.75,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
      });
      cornerPoints.forEach(([cx, cz]) => {
        const vSphere = new THREE.Mesh(vertexSphereGeo, vertexSphereMat);
        vSphere.position.set(cx, tileThickness * 0.5, cz);
        vertexGroup.add(vSphere);
      });
      faceContentGroup.add(vertexGroup);

      // 7. Composite Brass Hinge Barrel Pin along the folding crease (for movable faces)
      const hingePinGroup = new THREE.Group();
      if (spec.maxFoldAngle > 0) {
        const pinLen = Math.min(spec.width, spec.height) * 0.52;
        const barrelGeo = new THREE.CylinderGeometry(0.032, 0.032, pinLen, 14);
        const barrelMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.24,
          metalness: 0.9,
        });
        const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
        // Align cylinder along hingeAxis
        const axisDir = new THREE.Vector3(...spec.hingeAxis).normalize();
        barrelMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axisDir);
        barrelMesh.position.y = tileThickness * 0.5;
        hingePinGroup.add(barrelMesh);
      }
      hingeGroup.add(hingePinGroup);

      const initialNorm = faceAnglesRef.current[spec.id] ?? 0;
      const axisVec = new THREE.Vector3(...spec.hingeAxis).normalize();
      hingeGroup.setRotationFromAxisAngle(axisVec, initialNorm * spec.maxFoldAngle);

      controllersMapRef.current.set(spec.id, {
        spec,
        hingeGroup,
        tileMesh,
        outlineLines,
        vertexGroup,
        hingePinGroup,
        axisVec,
        currentNormalized: initialNorm,
      });

      // Recursively build child faces attached to this face
      if (spec.children) {
        spec.children.forEach((childSpec) => {
          buildFaceHierarchy(childSpec, faceContentGroup);
        });
      }
    };

    buildFaceHierarchy(solid.rootFace, netRoot);

    // Rebuild the everyday object miniature on the side pedestal
    if (everydayMount) {
      everydayMount.clear();
      const propModel = createEverydayObjectModel(solid.id);
      everydayMount.add(propModel);
    }
  }, [solid, materialFinish]);

  // Toggle vertices/edges highlights without rebuilding geometry
  useEffect(() => {
    controllersMapRef.current.forEach((ctrl) => {
      ctrl.vertexGroup.visible = showVerticesAndEdges;
      const lineMat = ctrl.outlineLines.material as THREE.LineBasicMaterial;
      lineMat.color.setHex(showVerticesAndEdges ? 0xfef08a : 0xffffff);
      lineMat.opacity = showVerticesAndEdges ? 0.95 : 0.35;
    });
  }, [showVerticesAndEdges]);

  // Toggle everyday comparison object visibility
  useEffect(() => {
    if (everydayMountRef.current) {
      everydayMountRef.current.visible = showEverydayObject;
    }
  }, [showEverydayObject]);

  // Highlight selected face
  useEffect(() => {
    controllersMapRef.current.forEach((ctrl, id) => {
      const mat = ctrl.tileMesh.material as THREE.MeshPhysicalMaterial;
      if (id === selectedFaceId) {
        mat.emissive.setHex(0xf59e0b);
        mat.emissiveIntensity = 0.25;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }, [selectedFaceId]);

  // Show celebratory 3D star burst when celebrationTrigger increments
  useEffect(() => {
    if (celebrationTrigger === 0 || !celebrationGroupRef.current) return;
    celebrationGroupRef.current.visible = true;
    const timer = window.setTimeout(() => {
      if (celebrationGroupRef.current) {
        celebrationGroupRef.current.visible = false;
      }
    }, 3800);
    return () => clearTimeout(timer);
  }, [celebrationTrigger]);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-screen h-screen overflow-hidden z-0"
      aria-label="Ambiente virtual 3D de planificação de sólidos geométricos"
    />
  );
};
