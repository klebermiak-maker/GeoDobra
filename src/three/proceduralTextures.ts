import * as THREE from 'three';
import { FaceNodeSpec, MaterialFinishId } from '../data/geometricSolids';

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: FaceNodeSpec['symbol'],
  cx: number,
  cy: number,
  radius: number,
  fillStyle: string
) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 4;

  switch (symbol) {
    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? radius : radius * 0.45;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'sun': {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * radius * 0.72, cy + Math.sin(angle) * radius * 0.72);
        ctx.lineTo(cx + Math.cos(angle) * radius * 1.02, cy + Math.sin(angle) * radius * 1.02);
        ctx.lineWidth = 6;
        ctx.strokeStyle = fillStyle;
        ctx.stroke();
      }
      break;
    }
    case 'heart': {
      const r = radius * 0.85;
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.75);
      ctx.bezierCurveTo(cx - r * 1.2, cy + r * 0.1, cx - r * 0.9, cy - r * 0.9, cx, cy - r * 0.35);
      ctx.bezierCurveTo(cx + r * 0.9, cy - r * 0.9, cx + r * 1.2, cy + r * 0.1, cx, cy + r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'crown': {
      const w = radius * 0.9;
      const h = radius * 0.65;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy + h);
      ctx.lineTo(cx - w * 0.85, cy - h * 0.7);
      ctx.lineTo(cx - w * 0.35, cy + h * 0.05);
      ctx.lineTo(cx, cy - h * 0.95);
      ctx.lineTo(cx + w * 0.35, cy + h * 0.05);
      ctx.lineTo(cx + w * 0.85, cy - h * 0.7);
      ctx.lineTo(cx + w, cy + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx + radius * 0.78, cy);
      ctx.lineTo(cx, cy + radius);
      ctx.lineTo(cx - radius * 0.78, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'clover': {
      const leafR = radius * 0.42;
      const offsets = [
        [0, -leafR * 0.85],
        [leafR * 0.85, 0],
        [0, leafR * 0.85],
        [-leafR * 0.85, 0],
      ];
      offsets.forEach(([ox, oy]) => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, leafR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      break;
    }
  }
  ctx.restore();
}

export function createFaceLabelTexture(
  face: FaceNodeSpec,
  finish: MaterialFinishId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = face.colorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle paper fiber or wood grain texture
  if (finish === 'wood') {
    ctx.fillStyle = 'rgba(120, 53, 15, 0.14)';
    for (let y = 0; y < 512; y += 6) {
      ctx.fillRect(0, y, 512, 2 + Math.sin(y * 0.1) * 1.5);
    }
  } else {
    // Craft paper subtle grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = step; i < 512; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  }

  // Dashed craft fold border
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(24, 24, 464, 464);
  ctx.restore();

  // Center medallion badge for face number & symbol
  const centerY = face.shape === 'isosceles_triangle' || face.shape === 'equilateral_triangle' ? 305 : 256;

  // Soft white circle medallion
  ctx.beginPath();
  ctx.arc(256, centerY, 128, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.stroke();

  // Draw small friendly symbol at top of medallion
  drawSymbol(ctx, face.symbol, 256, centerY - 56, 28, face.colorHex);

  // Draw bold face number
  ctx.fillStyle = '#0F172A';
  ctx.font = '700 104px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(face.labelNumber), 256, centerY + 18);

  // Draw shape name label at bottom of medallion
  const shapeName =
    face.shape === 'square'
      ? 'QUADRADO'
      : face.shape === 'rectangle'
      ? 'RETÂNGULO'
      : 'TRIÂNGULO';
  ctx.fillStyle = '#334155';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(shapeName, 256, centerY + 86);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createCuttingMatTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Classroom self-healing cutting mat deep teal-slate surface
  ctx.fillStyle = '#134E4A';
  ctx.fillRect(0, 0, 1024, 1024);

  // Outer measurement border
  ctx.strokeStyle = 'rgba(204, 251, 241, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(36, 36, 952, 952);

  // Minor grid lines
  ctx.strokeStyle = 'rgba(204, 251, 241, 0.12)';
  ctx.lineWidth = 1.5;
  const subStep = 32;
  for (let i = 64; i <= 960; i += subStep) {
    ctx.beginPath();
    ctx.moveTo(i, 36);
    ctx.lineTo(i, 988);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(36, i);
    ctx.lineTo(988, i);
    ctx.stroke();
  }

  // Major 5cm grid lines
  ctx.strokeStyle = 'rgba(204, 251, 241, 0.28)';
  ctx.lineWidth = 2.5;
  const majorStep = 128;
  for (let i = 128; i <= 896; i += majorStep) {
    ctx.beginPath();
    ctx.moveTo(i, 36);
    ctx.lineTo(i, 988);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(36, i);
    ctx.lineTo(988, i);
    ctx.stroke();
  }

  // Protractor alignment circles in center
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.26)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(512, 512, 220, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.arc(512, 512, 340, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ruler numbers along top & left edge
  ctx.fillStyle = 'rgba(204, 251, 241, 0.65)';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (let idx = 1; idx <= 7; idx++) {
    const pos = idx * 128;
    ctx.fillText(`${idx * 5}cm`, pos, 26);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createWoodTableTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78350F';
  ctx.fillRect(0, 0, 512, 512);

  // Procedural warm oak wood grain planks
  for (let i = 0; i < 160; i++) {
    const y = (i * 512) / 160;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(146, 64, 14, 0.35)' : 'rgba(69, 26, 3, 0.22)';
    ctx.fillRect(0, y, 512, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.65)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.28)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createRoughnessNoiseTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    // Deterministic pseudo-random grain for tactile paper/wood roughness
    const v = 160 + ((i * 73 + (i >> 3) * 29) % 75);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace; // Data map stays in linear space
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
