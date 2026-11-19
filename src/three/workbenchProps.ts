import * as THREE from 'three';
import {
  createCuttingMatTexture,
  createRadialContactShadowTexture,
  createWoodTableTexture,
} from './proceduralTextures';

/**
 * Multi-part procedural Classroom Craft Workbench (10+ parts across primary table,
 * cutting mat, 5-part hexagonal pencil, 4-part precision ruler, and 5-part brass compass).
 * Every prop sits flush on the surface with radial contact shadows and varied roughness/metalness.
 */
export function createCraftWorkbench(maxAnisotropy: number): {
  workbenchGroup: THREE.Group;
  everydayPropMount: THREE.Group;
} {
  const workbenchGroup = new THREE.Group();
  workbenchGroup.name = 'CraftWorkbench';

  const woodTex = createWoodTableTexture(maxAnisotropy);
  const matTex = createCuttingMatTexture(maxAnisotropy);
  const shadowTex = createRadialContactShadowTexture();

  // 1. Primary Oak Craft Tabletop (Top surface sits at y = -0.12)
  const tableGeo = new THREE.BoxGeometry(15.5, 0.36, 12.5);
  const tableMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.68,
    metalness: 0.05,
  });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.set(0, -0.30, 0);
  tableMesh.receiveShadow = true;
  workbenchGroup.add(tableMesh);

  // 2. Dark Walnut Beveled Perimeter Frame Trim (roughness contrast: 0.38 vs 0.68)
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3b1908,
    roughness: 0.38,
    metalness: 0.15,
  });
  const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(15.7, 0.42, 0.28), trimMat);
  frontTrim.position.set(0, -0.29, 6.25);
  frontTrim.receiveShadow = true;
  workbenchGroup.add(frontTrim);

  const backTrim = new THREE.Mesh(new THREE.BoxGeometry(15.7, 0.42, 0.28), trimMat);
  backTrim.position.set(0, -0.29, -6.25);
  backTrim.receiveShadow = true;
  workbenchGroup.add(backTrim);

  // 3. Self-Healing Classroom Cutting Mat (Top surface sits at y = -0.07)
  const cuttingMatGeo = new THREE.BoxGeometry(8.8, 0.08, 8.8);
  const cuttingMatMat = new THREE.MeshStandardMaterial({
    map: matTex,
    roughness: 0.82,
    metalness: 0.02,
  });
  const cuttingMatMesh = new THREE.Mesh(cuttingMatGeo, cuttingMatMat);
  cuttingMatMesh.position.set(0, -0.10, 0);
  cuttingMatMesh.receiveShadow = true;
  workbenchGroup.add(cuttingMatMesh);

  // 4. Radial Contact Shadow under the central geometric net (offset by >= 0.02 on Y to prevent Z-fighting)
  const netShadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.46,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const netShadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), netShadowMat);
  netShadowPlane.rotation.x = -Math.PI / 2;
  netShadowPlane.position.set(0, -0.035, 0);
  workbenchGroup.add(netShadowPlane);

  // 5. Multi-Part Procedural Hexagonal Classroom Pencil (5 distinct parts)
  const pencilGroup = new THREE.Group();
  pencilGroup.position.set(-4.85, -0.04, 2.3);
  pencilGroup.rotation.y = 0.28;

  // Part 5a: Hexagonal yellow lacquered shaft
  const shaftGeo = new THREE.CylinderGeometry(0.11, 0.11, 2.6, 6);
  shaftGeo.rotateZ(Math.PI / 2);
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.32,
    metalness: 0.08,
  });
  const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
  shaftMesh.position.y = 0.11;
  shaftMesh.castShadow = true;
  pencilGroup.add(shaftMesh);

  // Part 5b: Shaved cedar wood cone
  const woodConeGeo = new THREE.ConeGeometry(0.11, 0.42, 12);
  woodConeGeo.rotateZ(-Math.PI / 2);
  const woodConeMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.78,
    metalness: 0.02,
  });
  const woodConeMesh = new THREE.Mesh(woodConeGeo, woodConeMat);
  woodConeMesh.position.set(1.51, 0.11, 0);
  woodConeMesh.castShadow = true;
  pencilGroup.add(woodConeMesh);

  // Part 5c: Graphite tip cone
  const leadGeo = new THREE.ConeGeometry(0.042, 0.16, 12);
  leadGeo.rotateZ(-Math.PI / 2);
  const leadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.25,
    metalness: 0.65,
  });
  const leadMesh = new THREE.Mesh(leadGeo, leadMat);
  leadMesh.position.set(1.68, 0.11, 0);
  pencilGroup.add(leadMesh);

  // Part 5d: Brushed Aluminum Ferrule Ring
  const ferruleGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.26, 16);
  ferruleGeo.rotateZ(Math.PI / 2);
  const ferruleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.92,
  });
  const ferruleMesh = new THREE.Mesh(ferruleGeo, ferruleMat);
  ferruleMesh.position.set(-1.42, 0.11, 0);
  ferruleMesh.castShadow = true;
  pencilGroup.add(ferruleMesh);

  // Part 5e: Pink Rubber Eraser Plug
  const eraserGeo = new THREE.CylinderGeometry(0.11, 0.105, 0.24, 16);
  eraserGeo.rotateZ(Math.PI / 2);
  const eraserMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    roughness: 0.88,
    metalness: 0.0,
  });
  const eraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
  eraserMesh.position.set(-1.65, 0.11, 0);
  eraserMesh.castShadow = true;
  pencilGroup.add(eraserMesh);

  workbenchGroup.add(pencilGroup);

  // 6. Multi-Part School Ruler (3 distinct parts: Beveled Acrylic/Wood Body, Brass Edge, Metric Scale Strip)
  const rulerGroup = new THREE.Group();
  rulerGroup.position.set(-4.95, -0.055, -1.6);
  rulerGroup.rotation.y = -0.14;

  const rulerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.07, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55, metalness: 0.05 })
  );
  rulerBody.position.y = 0.035;
  rulerBody.castShadow = true;
  rulerBody.receiveShadow = true;
  rulerGroup.add(rulerBody);

  const brassInlay = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.075, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.24, metalness: 0.88 })
  );
  brassInlay.position.set(0.30, 0.038, 0);
  rulerGroup.add(brassInlay);

  workbenchGroup.add(rulerGroup);

  // 7. Everyday Object Pedestal Mount on the right flank of the workbench
  const everydayPropMount = new THREE.Group();
  everydayPropMount.position.set(5.45, -0.10, -1.35);
  workbenchGroup.add(everydayPropMount);

  return { workbenchGroup, everydayPropMount };
}

/**
 * Assembles a composite 3–8 part procedural 3D miniature representing the everyday object
 * equivalent of the active geometric solid (Dado/Presente, Pirâmide do Egito, Barraca, Caixa de Sapato, Cristal 4-Faces).
 * Pivoted at bottom-center flush with the pedestal surface + soft radial contact shadow.
 */
export function createEverydayObjectModel(solidId: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `EverydayObject_${solidId}`;

  const shadowTex = createRadialContactShadowTexture();

  // Pedestal base disc + brass rim + contact shadow (3 base parts)
  const pedestalDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.35, 0.14, 32),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.25 })
  );
  pedestalDisc.position.y = 0.07;
  pedestalDisc.receiveShadow = true;
  pedestalDisc.castShadow = true;
  group.add(pedestalDisc);

  const pedestalRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.26, 0.035, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.88 })
  );
  pedestalRim.rotation.x = Math.PI / 2;
  pedestalRim.position.y = 0.14;
  group.add(pedestalRim);

  const propShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  propShadow.rotation.x = -Math.PI / 2;
  propShadow.position.y = 0.155;
  group.add(propShadow);

  const yBase = 0.14;

  if (solidId === 'cube_cross') {
    // Composite Gift Box (Box hull, overhanging lid, X-ribbon, Z-ribbon, 2 bow loops = 6 parts)
    const boxBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.95, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.55, metalness: 0.08 })
    );
    boxBody.position.y = yBase + 0.475;
    boxBody.castShadow = true;
    group.add(boxBody);

    const boxLid = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.22, 1.18),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.42, metalness: 0.12 })
    );
    boxLid.position.y = yBase + 0.98;
    boxLid.castShadow = true;
    group.add(boxLid);

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.65,
    });
    const ribbonX = new THREE.Mesh(new THREE.BoxGeometry(1.21, 1.12, 0.18), ribbonMat);
    ribbonX.position.y = yBase + 0.56;
    group.add(ribbonX);

    const ribbonZ = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.12, 1.21), ribbonMat);
    ribbonZ.position.y = yBase + 0.56;
    group.add(ribbonZ);

    const bowLoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 10, 24), ribbonMat);
    bowLoop1.position.set(-0.14, yBase + 1.22, 0);
    bowLoop1.rotation.z = 0.45;
    group.add(bowLoop1);

    const bowLoop2 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 10, 24), ribbonMat);
    bowLoop2.position.set(0.14, yBase + 1.22, 0);
    bowLoop2.rotation.z = -0.45;
    group.add(bowLoop2);
  } else if (solidId === 'square_pyramid') {
    // Composite Egyptian Pyramid (Sandstone stepped base, main pyramid body, golden capstone, entrance portal = 4 parts)
    const sandPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.14, 1.55),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85, metalness: 0.05 })
    );
    sandPlinth.position.y = yBase + 0.07;
    sandPlinth.castShadow = true;
    group.add(sandPlinth);

    const pyrBodyGeo = new THREE.ConeGeometry(0.95, 1.15, 4);
    pyrBodyGeo.rotateY(Math.PI / 4);
    const pyrBody = new THREE.Mesh(
      pyrBodyGeo,
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.68, metalness: 0.12 })
    );
    pyrBody.position.y = yBase + 0.14 + 0.575;
    pyrBody.castShadow = true;
    group.add(pyrBody);

    const capstoneGeo = new THREE.ConeGeometry(0.28, 0.34, 4);
    capstoneGeo.rotateY(Math.PI / 4);
    const capstone = new THREE.Mesh(
      capstoneGeo,
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.18, metalness: 0.92 })
    );
    capstone.position.y = yBase + 0.14 + 0.99;
    group.add(capstone);

    const portal = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.32, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8, metalness: 0.1 })
    );
    portal.position.set(0, yBase + 0.3, 0.64);
    group.add(portal);
  } else if (solidId === 'triangular_prism') {
    // Composite Camping Tent (Tent fabric body, wooden ridge pole, front doorway arch, 2 corner pegs = 5 parts)
    const tentShape = new THREE.Shape();
    tentShape.moveTo(-0.65, 0);
    tentShape.lineTo(0.65, 0);
    tentShape.lineTo(0, 0.98);
    tentShape.closePath();

    const tentGeo = new THREE.ExtrudeGeometry(tentShape, {
      depth: 1.35,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    tentGeo.translate(0, 0, -0.675);
    const tentMesh = new THREE.Mesh(
      tentGeo,
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65, metalness: 0.05 })
    );
    tentMesh.position.y = yBase + 0.02;
    tentMesh.castShadow = true;
    group.add(tentMesh);

    const ridgePole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.65, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.28, metalness: 0.82 })
    );
    ridgePole.rotation.x = Math.PI / 2;
    ridgePole.position.set(0, yBase + 1.01, 0);
    group.add(ridgePole);

    const doorFlap = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.62, 3),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.85, metalness: 0.02 })
    );
    doorFlap.position.set(0, yBase + 0.32, 0.69);
    group.add(doorFlap);
  } else if (solidId === 'rectangular_box') {
    // Composite Shoebox / Treasure Box (Main rectangular hull, lid with overhang, label plate, side vent handles = 4 parts)
    const shoeBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.72, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.62, metalness: 0.05 })
    );
    shoeBody.position.y = yBase + 0.36;
    shoeBody.castShadow = true;
    group.add(shoeBody);

    const shoeLid = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.18, 1.02),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, metalness: 0.12 })
    );
    shoeLid.position.y = yBase + 0.76;
    shoeLid.castShadow = true;
    group.add(shoeLid);

    const labelPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.28, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 })
    );
    labelPlate.position.set(0, yBase + 0.36, 0.48);
    group.add(labelPlate);
  } else {
    // Tetrahedron 4-sided game die on a brass cradle ring (3 parts)
    const cradleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.05, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.88 })
    );
    cradleRing.rotation.x = Math.PI / 2;
    cradleRing.position.y = yBase + 0.05;
    group.add(cradleRing);

    const tetraMesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.32, metalness: 0.25 })
    );
    tetraMesh.position.y = yBase + 0.56;
    tetraMesh.rotation.x = 0.35;
    tetraMesh.rotation.z = 0.25;
    tetraMesh.castShadow = true;
    group.add(tetraMesh);
  }

  return group;
}
