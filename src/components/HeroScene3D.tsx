import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BrandingConfig } from '../types/hab';
import { calculateCountdown, CountdownParts } from '../utils/habLogic';
import {
  drawFallbackKemenagCrestOnCanvas,
  drawProceduralHab81OnCanvas,
  ensureWhiteRibbonKemenagCanvas,
  Hab81LogoBadge,
  KemenagLogoImg,
  loadAnonymousImage,
} from './DynamicLogoBadge';
import { Calendar, ChevronDown, ChevronUp, Compass, QrCode, ShieldCheck, Sliders, Trophy } from 'lucide-react';

interface HeroScene3DProps {
  branding: BrandingConfig;
  totalCompetitions: number;
  totalRegistrations: number;
  totalCoupons: number;
  isInlineEditMode?: boolean;
  onUpdateBranding?: (partial: Partial<BrandingConfig>) => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenAdmin: () => void;
  onOpenAdminBranding?: () => void;
}

type FinishPreset = 'emerald_gold' | 'royal_platinum' | 'imperial_bronze';
type CameraPreset = 'front_kemenag' | 'back_hab81' | 'iso_harmony';

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _dummyObj = new THREE.Object3D();
const _curvePoint = new THREE.Vector3();
const _curveTangent = new THREE.Vector3();

function createBumpNoiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Concentric brushed lathe rings
  const cx = 128;
  const cy = 128;
  for (let r = 8; r < 126; r += 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 4 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildMedallionFrontCanvas(kemenagImg: HTMLImageElement | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  // Radial emerald background
  const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 256);
  bg.addColorStop(0, '#065f46');
  bg.addColorStop(0.7, '#064e3b');
  bg.addColorStop(1, '#022c22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Decorative guilloche rays
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.16)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 36; i++) {
    ctx.rotate((Math.PI * 2) / 36);
    ctx.beginPath();
    ctx.moveTo(75, 0);
    ctx.lineTo(205, 0);
    ctx.stroke();
  }
  ctx.restore();

  // Outer gold ring borders
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 178, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center Logo (with guaranteed white ribbon background for IKHLAS BERAMAL)
  if (kemenagImg) {
    const cleanLogoCanvas = ensureWhiteRibbonKemenagCanvas(kemenagImg);
    const size = 216;
    ctx.drawImage(cleanLogoCanvas, cx - size / 2, cy - size / 2 - 8, size, size);
  } else {
    drawFallbackKemenagCrestOnCanvas(ctx, cx, cy - 6, 115);
  }

  // Top & Bottom inscriptions
  ctx.fillStyle = '#fef08a';
  ctx.font = '700 20px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('KEMENTERIAN AGAMA RI', cx, 56);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KABUPATEN TOJO UNA-UNA • 2027', cx, 464);

  return canvas;
}

function buildMedallionBackCanvas(
  habCustomImg: HTMLImageElement | null,
  tagline: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  const bg = ctx.createRadialGradient(cx, cy, 16, cx, cy, 256);
  bg.addColorStop(0, '#047857');
  bg.addColorStop(0.65, '#064e3b');
  bg.addColorStop(1, '#022c22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  ctx.stroke();

  if (habCustomImg) {
    const size = 220;
    ctx.drawImage(habCustomImg, cx - size / 2, cy - size / 2 - 6, size, size);
  } else {
    drawProceduralHab81OnCanvas(ctx, cx, cy - 4, 128);
  }

  ctx.fillStyle = '#fef08a';
  ctx.font = '700 19px "Cinzel", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('HARI AMAL BAKTI KE-81', cx, 54);

  const shortTag = tagline.length > 36 ? tagline.slice(0, 36) + '…' : tagline;
  ctx.fillStyle = '#fde68a';
  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(shortTag.toUpperCase(), cx, 464);

  return canvas;
}

export const HeroScene3D: React.FC<HeroScene3DProps> = ({
  branding,
  totalCompetitions,
  totalRegistrations,
  totalCoupons,
  isInlineEditMode = false,
  onUpdateBranding,
  onNavigateSection,
  onOpenAdmin,
  onOpenAdminBranding,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    calculateCountdown(branding.countdownTargetIso)
  );
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('front_kemenag');
  const [finishPreset, setFinishPreset] = useState<FinishPreset>('emerald_gold');
  const [explodedAmount, setExplodedAmount] = useState<number>(0); // 0 to 1
  const [ribbonSpeed, setRibbonSpeed] = useState<number>(1);

  // Mutable refs for the 60fps loop so React state changes never recreate the WebGL scene
  const controlStateRef = useRef({
    cameraPreset: 'front_kemenag' as CameraPreset,
    finishPreset: 'emerald_gold' as FinishPreset,
    explodedAmount: 0,
    ribbonSpeed: 1,
    pointerX: 0,
    pointerY: 0,
  });

  const textureCallbacksRef = useRef<{
    updateFrontBackTextures?: (b: BrandingConfig) => void;
    updateMaterialFinish?: (f: FinishPreset) => void;
  }>({});

  useEffect(() => {
    controlStateRef.current.cameraPreset = cameraPreset;
  }, [cameraPreset]);

  useEffect(() => {
    controlStateRef.current.finishPreset = finishPreset;
    textureCallbacksRef.current.updateMaterialFinish?.(finishPreset);
  }, [finishPreset]);

  useEffect(() => {
    controlStateRef.current.explodedAmount = explodedAmount;
  }, [explodedAmount]);

  useEffect(() => {
    controlStateRef.current.ribbonSpeed = ribbonSpeed;
  }, [ribbonSpeed]);

  // Update countdown every 1s
  useEffect(() => {
    setCountdown(calculateCountdown(branding.countdownTargetIso));
    const timer = window.setInterval(() => {
      setCountdown(calculateCountdown(branding.countdownTargetIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [branding.countdownTargetIso]);

  // Re-bake medallion textures whenever Admin updates logos or tagline
  useEffect(() => {
    textureCallbacksRef.current.updateFrontBackTextures?.(branding);
  }, [
    branding.kemenagLogoPrimaryUrl,
    branding.kemenagLogoFallbackUrl,
    branding.habLogoCustomUrl,
    branding.officialTagline,
  ]);

  // Keyboard shortcut 'H' to toggle HUD dock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x021b15);
    scene.fog = new THREE.FogExp2(0x021b15, 0.032);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    camera.position.set(0, 0.6, 10.5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const isMobileScreen = window.innerWidth < 768;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isMobileScreen ? 1.25 : 1.75)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl && !isMobileScreen;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Rig
    const hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x022c22, 1.15);
    hemiLight.position.set(0, 15, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
    keyLight.position.set(6, 9, 9);
    keyLight.castShadow = !isSoftwareGl;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfbbf24, 2.1);
    rimLight.position.set(-7, 5, -5);
    scene.add(rimLight);

    const frontSpot = new THREE.PointLight(0xfef08a, 3.2, 16, 1.5);
    frontSpot.position.set(3.2, 1.2, 5.5);
    scene.add(frontSpot);

    // Shared Materials with varied roughness/metalness (>= 0.25 difference across adjacent parts)
    const bumpTex = createBumpNoiseTexture();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    bumpTex.anisotropy = maxAniso;

    const goldBezelMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 0.65,
      clearcoatRoughness: 0.15,
      bumpMap: bumpTex,
      bumpScale: 0.015,
    });

    const emeraldLacquerMat = new THREE.MeshPhysicalMaterial({
      color: 0x059669,
      metalness: 0.35,
      roughness: 0.45,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    });

    const brushedAccentMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      metalness: 0.82,
      roughness: 0.38,
      bumpMap: bumpTex,
      bumpScale: 0.02,
    });

    const darkPlinthMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      metalness: 0.25,
      roughness: 0.7,
    });

    // Front & Back Medallion Face Textures
    const frontTexture = new THREE.CanvasTexture(buildMedallionFrontCanvas(null));
    frontTexture.colorSpace = THREE.SRGBColorSpace;
    frontTexture.anisotropy = maxAniso;

    const backTexture = new THREE.CanvasTexture(
      buildMedallionBackCanvas(null, branding.officialTagline)
    );
    backTexture.colorSpace = THREE.SRGBColorSpace;
    backTexture.anisotropy = maxAniso;

    const frontFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: frontTexture,
      metalness: 0.08,
      roughness: 0.42,
      bumpMap: bumpTex,
      bumpScale: 0.006,
      fog: false,
    });

    const backFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: backTexture,
      metalness: 0.08,
      roughness: 0.42,
      bumpMap: bumpTex,
      bumpScale: 0.006,
      fog: false,
    });

    // Expose callback to update textures when Admin changes logos
    textureCallbacksRef.current.updateFrontBackTextures = async (b: BrandingConfig) => {
      const [kemenagImg, habImg] = await Promise.all([
        loadAnonymousImage(b.kemenagLogoPrimaryUrl, b.kemenagLogoFallbackUrl),
        b.habLogoCustomUrl ? loadAnonymousImage(b.habLogoCustomUrl) : Promise.resolve(null),
      ]);
      const newFrontCanvas = buildMedallionFrontCanvas(kemenagImg);
      frontTexture.image = newFrontCanvas;
      frontTexture.needsUpdate = true;

      const newBackCanvas = buildMedallionBackCanvas(habImg, b.officialTagline);
      backTexture.image = newBackCanvas;
      backTexture.needsUpdate = true;
    };

    textureCallbacksRef.current.updateMaterialFinish = (preset: FinishPreset) => {
      if (preset === 'emerald_gold') {
        goldBezelMat.color.setHex(0xfbbf24);
        emeraldLacquerMat.color.setHex(0x059669);
        brushedAccentMat.color.setHex(0xfde047);
      } else if (preset === 'royal_platinum') {
        goldBezelMat.color.setHex(0xe2e8f0);
        emeraldLacquerMat.color.setHex(0x0f766e);
        brushedAccentMat.color.setHex(0x38bdf8);
      } else {
        goldBezelMat.color.setHex(0xd97706);
        emeraldLacquerMat.color.setHex(0x065f46);
        brushedAccentMat.color.setHex(0xfbbf24);
      }
    };

    // Trigger initial async logo texture load
    textureCallbacksRef.current.updateFrontBackTextures(branding);

    // =========================================================================
    // COMPOSITE 10-PART PROCEDURAL MEDALLION SUBJECT (THREE.Group)
    // Positioned on the right half on desktop so left editorial hero copy is 100% clear
    // =========================================================================
    const heroRootGroup = new THREE.Group();
    heroRootGroup.position.set(width >= 1024 ? 2.55 : 0, 0.45, 0);
    heroRootGroup.scale.setScalar(width >= 1024 ? 1.08 : 0.85);
    scene.add(heroRootGroup);

    const medallionGroup = new THREE.Group();
    heroRootGroup.add(medallionGroup);

    // Part 1: LatheGeometry Outer Fluted Gold Bezel Ring
    const lathePoints = [
      new THREE.Vector2(1.48, -0.22),
      new THREE.Vector2(1.78, -0.22),
      new THREE.Vector2(1.88, -0.1),
      new THREE.Vector2(1.88, 0.1),
      new THREE.Vector2(1.78, 0.22),
      new THREE.Vector2(1.48, 0.22),
      new THREE.Vector2(1.48, -0.22),
    ];
    const outerBezelGeo = new THREE.LatheGeometry(lathePoints, 48);
    outerBezelGeo.rotateX(Math.PI / 2);
    const outerBezelMesh = new THREE.Mesh(outerBezelGeo, goldBezelMat);
    outerBezelMesh.castShadow = !isSoftwareGl;
    outerBezelMesh.receiveShadow = !isSoftwareGl;
    medallionGroup.add(outerBezelMesh);

    // Part 2: ExtrudeGeometry 8-Pointed Rub el Hizb Emerald Star Frame
    const starShape = new THREE.Shape();
    const numPoints = 8;
    const outerR = 2.08;
    const innerR = 1.62;
    for (let i = 0; i < numPoints * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / numPoints;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 1.44, 0, Math.PI * 2, true);
    starShape.holes.push(holePath);

    const starFrameGeo = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    starFrameGeo.center();
    const starFrameMesh = new THREE.Mesh(starFrameGeo, emeraldLacquerMat);
    starFrameMesh.castShadow = !isSoftwareGl;
    medallionGroup.add(starFrameMesh);

    // Part 3: Inner Guilloche Chapter Ring (Front & Back)
    const chapterRingGeo = new THREE.TorusGeometry(1.48, 0.065, 16, 64);
    const frontChapterRing = new THREE.Mesh(chapterRingGeo, brushedAccentMat);
    frontChapterRing.position.z = 0.22;
    medallionGroup.add(frontChapterRing);

    const backChapterRing = new THREE.Mesh(chapterRingGeo, brushedAccentMat);
    backChapterRing.position.z = -0.22;
    medallionGroup.add(backChapterRing);

    // Part 4: Front Medallion Face Disc (Official Kemenag Logo)
    const faceDiscGeo = new THREE.CylinderGeometry(1.46, 1.46, 0.08, 48);
    faceDiscGeo.rotateX(Math.PI / 2);
    faceDiscGeo.rotateZ(Math.PI / 2);
    const frontDiscMesh = new THREE.Mesh(faceDiscGeo, frontFaceMat);
    frontDiscMesh.position.z = 0.16;
    medallionGroup.add(frontDiscMesh);

    // Part 5: Back Medallion Face Disc (Dynamic HAB-81 Logo)
    const backDiscGeo = new THREE.CylinderGeometry(1.46, 1.46, 0.08, 48);
    backDiscGeo.rotateX(-Math.PI / 2);
    backDiscGeo.rotateZ(-Math.PI / 2);
    const backDiscMesh = new THREE.Mesh(backDiscGeo, backFaceMat);
    backDiscMesh.position.z = -0.16;
    medallionGroup.add(backDiscMesh);

    // Part 6: Sovereign Crown Bail & Finial Spire at top of Medallion
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 2.25, 0);
    const bailGeo = new THREE.TorusGeometry(0.26, 0.06, 14, 32);
    const bailMesh = new THREE.Mesh(bailGeo, goldBezelMat);
    crownGroup.add(bailMesh);
    const finialGeo = new THREE.ConeGeometry(0.16, 0.42, 8);
    const finialMesh = new THREE.Mesh(finialGeo, brushedAccentMat);
    finialMesh.position.y = 0.32;
    crownGroup.add(finialMesh);
    medallionGroup.add(crownGroup);

    // Part 7 & 8: Twin Orbital Gyroscope Rings around Medallion
    const gyroRing1Geo = new THREE.TorusGeometry(2.38, 0.038, 12, 72);
    const gyroRing1 = new THREE.Mesh(gyroRing1Geo, goldBezelMat);
    gyroRing1.rotation.set(0.45, 0.2, 0);
    heroRootGroup.add(gyroRing1);

    const gyroRing2Geo = new THREE.TorusGeometry(2.62, 0.03, 12, 72);
    const gyroRing2 = new THREE.Mesh(gyroRing2Geo, emeraldLacquerMat);
    gyroRing2.rotation.set(-0.52, -0.3, 0.2);
    heroRootGroup.add(gyroRing2);

    // Part 9: Tiered Pedestal Plinth grounded below Medallion + Contact Shadow Disc
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -2.85, 0);
    const plinthTopGeo = new THREE.CylinderGeometry(1.6, 1.85, 0.26, 36);
    const plinthTop = new THREE.Mesh(plinthTopGeo, darkPlinthMat);
    plinthTop.position.y = 0.25;
    plinthTop.receiveShadow = !isSoftwareGl;
    pedestalGroup.add(plinthTop);

    const plinthGoldRimGeo = new THREE.CylinderGeometry(1.88, 1.92, 0.08, 36);
    const plinthGoldRim = new THREE.Mesh(plinthGoldRimGeo, goldBezelMat);
    plinthGoldRim.position.y = 0.08;
    pedestalGroup.add(plinthGoldRim);

    // Soft radial contact shadow disc (offset by +0.015 on Y to prevent Z-fighting)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
    sGrad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactShadowMesh.position.y = 0.015;
    pedestalGroup.add(contactShadowMesh);
    heroRootGroup.add(pedestalGroup);

    // =========================================================================
    // Part 10: 6 CatmullRomCurve3 "Jalinan Kerukunan" Ribbons + InstancedMesh Motes
    // =========================================================================
    const ribbonCurves: THREE.CatmullRomCurve3[] = [];
    const ribbonMeshes: THREE.Mesh[] = [];
    const ribbonColors = [0x10b981, 0xfbbf24, 0x34d399, 0xfde047, 0x059669, 0xf59e0b];

    for (let r = 0; r < 6; r++) {
      const yOffset = (r - 2.5) * 0.72;
      const phase = (r * Math.PI) / 3;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 8; s++) {
        const t = (s / 8) * 2 - 1; // -1 to 1
        const x = t * 10.5;
        const y =
          yOffset +
          Math.sin(t * Math.PI * 1.3 + phase) * 1.35 +
          Math.cos(t * 2.0 + r) * 0.35;
        const z = -1.6 + Math.cos(t * Math.PI + phase) * 1.8;
        pts.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      ribbonCurves.push(curve);

      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.042 + (r % 2) * 0.014, 8, false);
      const isGold = r % 2 === 1;
      const tubeMat = new THREE.MeshStandardMaterial({
        color: ribbonColors[r],
        emissive: ribbonColors[r],
        emissiveIntensity: isGold ? 0.65 : 0.45,
        metalness: isGold ? 0.85 : 0.4,
        roughness: 0.2,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);
      ribbonMeshes.push(tubeMesh);
    }

    // InstancedMesh of 120 glowing harmony particles flowing along the 6 CatmullRomCurve3 paths
    const particleCount = 120;
    const moteGeo = new THREE.OctahedronGeometry(0.075, 0);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const motesInstanced = new THREE.InstancedMesh(moteGeo, moteMat, particleCount);
    motesInstanced.frustumCulled = false;

    const cGold = new THREE.Color(0xfef08a);
    const cEmerald = new THREE.Color(0x6ee7b7);
    for (let i = 0; i < particleCount; i++) {
      motesInstanced.setColorAt(i, i % 2 === 0 ? cGold : cEmerald);
    }
    if (motesInstanced.instanceColor) motesInstanced.instanceColor.needsUpdate = true;
    scene.add(motesInstanced);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer move parallax listener
    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      controlStateRef.current.pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      controlStateRef.current.pointerY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      heroRootGroup.position.set(w >= 1024 ? 2.55 : 0, 0.45, 0);
      heroRootGroup.scale.setScalar(w >= 1024 ? 1.08 : 0.85);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Paced Animation Loop (pauses automatically when scrolled out of view on mobile/desktop)
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;
    let isInViewport = true;
    let isLoopRunning = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed || !isInViewport || document.hidden) {
          isLoopRunning = false;
          return;
        }
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

    let elapsed = 0;
    let currentRotY = 0;
    let currentRotX = 0;
    let currentExplode = 0;

    function tick() {
      if (isDisposed || !isInViewport || document.hidden) {
        isLoopRunning = false;
        return;
      }
      isLoopRunning = true;
      const dt = Math.min(clock.getDelta(), 0.1);
      const state = controlStateRef.current;
      elapsed += dt * state.ribbonSpeed;

      // Determine target medallion rotation based on cameraPreset + pointer parallax
      let targetRotY = Math.sin(elapsed * 0.45) * 0.32 + state.pointerX * 0.45;
      let targetRotX = state.pointerY * 0.25;

      if (state.cameraPreset === 'back_hab81') {
        targetRotY += Math.PI;
      } else if (state.cameraPreset === 'iso_harmony') {
        targetRotY += 0.68;
        targetRotX += 0.18;
      }

      currentRotY = THREE.MathUtils.damp(currentRotY, targetRotY, 4.5, dt);
      currentRotX = THREE.MathUtils.damp(currentRotX, targetRotX, 4.5, dt);
      currentExplode = THREE.MathUtils.damp(currentExplode, state.explodedAmount, 6.0, dt);

      medallionGroup.rotation.y = currentRotY;
      medallionGroup.rotation.x = currentRotX;
      medallionGroup.position.y = Math.sin(elapsed * 1.4) * 0.12;

      // Exploded view layer separation along Z & Y
      frontDiscMesh.position.z = 0.16 + currentExplode * 0.95;
      frontChapterRing.position.z = 0.22 + currentExplode * 1.35;
      backDiscMesh.position.z = -0.16 - currentExplode * 0.95;
      backChapterRing.position.z = -0.22 - currentExplode * 1.35;
      starFrameMesh.position.z = -currentExplode * 0.35;
      crownGroup.position.y = 2.25 + currentExplode * 0.55;

      // Gyroscope orbital rings rotation
      gyroRing1.rotation.z = elapsed * 0.35;
      gyroRing1.rotation.x = 0.45 + Math.sin(elapsed * 0.5) * 0.15;
      gyroRing2.rotation.y = -elapsed * 0.28;

      // Update 120 instanced particles along the 6 CatmullRomCurve3 ribbons
      for (let i = 0; i < particleCount; i++) {
        const curveIdx = i % ribbonCurves.length;
        const curve = ribbonCurves[curveIdx];
        const u = ((i / particleCount) * 3 + elapsed * (0.08 + (curveIdx % 3) * 0.02)) % 1;
        curve.getPointAt(u, _curvePoint);
        curve.getTangentAt(u, _curveTangent);

        _dummyObj.position.copy(_curvePoint);
        _dummyObj.rotation.set(elapsed * 2 + i, elapsed * 1.5, 0);
        const s = 0.75 + Math.sin(elapsed * 3 + i) * 0.35;
        _dummyObj.scale.setScalar(s);
        _dummyObj.updateMatrix();
        motesInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      motesInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    const startOrResumeLoop = () => {
      if (isDisposed || isLoopRunning || !isInViewport || document.hidden) return;
      clock.getDelta();
      tick();
    };

    const visibilityObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              isInViewport = entry.isIntersecting;
              if (isInViewport) {
                startOrResumeLoop();
              } else {
                cancelAnimationFrame(frameId);
                clearTimeout(frameId);
                isLoopRunning = false;
              }
            },
            { rootMargin: '150px 0px 150px 0px', threshold: 0.01 }
          )
        : null;

    visibilityObserver?.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        isLoopRunning = false;
      } else if (isInViewport) {
        startOrResumeLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      visibilityObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <section
      id="beranda"
      aria-label="Hero Peringatan Hari Amal Bakti ke-81 Kementerian Agama"
      className="relative w-full min-h-[720px] lg:min-h-[calc(100vh-5.25rem)] overflow-hidden bg-[#021b15] flex flex-col justify-between border-b border-emerald-900/70"
    >
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="hero-3d-canvas"
        className="absolute inset-0 w-full h-full pointer-events-auto z-0"
      />

      {/* Left-Only Vignette Scrim so Right 3D Medallion & Ribbons are 100% Unobstructed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[58%] z-10 bg-gradient-to-r from-[#021b15]/95 via-[#021b15]/80 to-transparent"
      />

      {/* Foreground Semantic Hero Content */}
      <div className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-6 lg:py-10 flex-1 flex flex-col justify-center pointer-events-none">
        <div className="max-w-2xl space-y-5 pointer-events-auto">
          {/* Dual Official Logos + Status Metadata Line (Zero Pill Discipline: Clean Unboxed Text with · Separator) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-[#042f24]/90 border border-amber-400/30 rounded-xl px-3 py-2 shadow-md">
              <KemenagLogoImg branding={branding} className="w-10 h-10" />
              <div className="h-7 w-px bg-amber-400/25" />
              <Hab81LogoBadge branding={branding} className="w-10 h-10" />
            </div>
            <div className="text-xs text-amber-200/90 font-medium tracking-wide flex flex-wrap items-center gap-1.5">
              {isInlineEditMode && onUpdateBranding ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    aria-label="Edit Teks Identitas Kemenag"
                    value={branding.heroEyebrow ?? 'Kemenag RI · Kab. Tojo Una-Una'}
                    onChange={(e) => onUpdateBranding({ heroEyebrow: e.target.value })}
                    className="px-2.5 py-1 rounded bg-[#021b15] border border-dashed border-amber-400 text-xs text-amber-200 focus:outline-none"
                  />
                  <span aria-hidden="true">·</span>
                  <input
                    type="text"
                    aria-label="Edit Status Logo HAB ke-81"
                    value={branding.habLogoStatusBadge}
                    onChange={(e) => onUpdateBranding({ habLogoStatusBadge: e.target.value })}
                    className="px-2.5 py-1 rounded bg-[#021b15] border border-dashed border-emerald-400 text-xs text-emerald-300 w-72 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <span>{branding.heroEyebrow ?? 'Kemenag RI · Kab. Tojo Una-Una'}</span>
                  {branding.showHabStatusBadge && branding.habLogoStatusBadge && (
                    <>
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        onClick={onOpenAdminBranding || onOpenAdmin}
                        title="Klik untuk mengubah logo atau teks status di Panel Admin"
                        className="text-emerald-300 hover:text-amber-300 underline decoration-emerald-500/50 underline-offset-4 cursor-pointer text-left"
                      >
                        {branding.habLogoStatusBadge}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Strict EYD Official Title & Subtitle (Directly Editable in Inline Edit Mode) */}
          <div className="space-y-2.5">
            {isInlineEditMode && onUpdateBranding ? (
              <div className="space-y-2 bg-[#021b15]/90 border border-dashed border-amber-400/80 rounded-xl p-3">
                <div className="text-[11px] font-bold text-amber-300">
                  Mode Edit Langsung — Judul Utama, Subjudul & Tema/Tagline:
                </div>
                <input
                  type="text"
                  aria-label="Edit Judul Utama HAB"
                  value={branding.officialTitle}
                  onChange={(e) => onUpdateBranding({ officialTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#03251c] border border-amber-400/60 font-display text-xl sm:text-2xl font-bold text-white focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="Edit Subjudul Instansi"
                  value={branding.officialSubtitle}
                  onChange={(e) => onUpdateBranding({ officialSubtitle: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-amber-400/60 text-sm sm:text-base font-semibold text-amber-300 focus:outline-none"
                />
                <textarea
                  rows={2}
                  aria-label="Edit Tema / Tagline Resmi"
                  value={branding.officialTagline}
                  onChange={(e) => onUpdateBranding({ officialTagline: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#03251c] border border-amber-400/60 text-xs sm:text-sm text-slate-200 focus:outline-none"
                />
              </div>
            ) : (
              <>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight [text-wrap:balance]">
                  {branding.officialTitle}
                </h1>
                <p className="text-lg sm:text-xl font-semibold text-amber-300 tracking-wide [text-wrap:balance]">
                  {branding.officialSubtitle}
                </p>
                <div className="text-[8px] font-normal tracking-wide text-slate-400/45 uppercase select-none">
                  by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
                </div>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  “{branding.officialTagline}”
                </p>
              </>
            )}
          </div>

          {/* Real-Time Countdown Timer to 3 Januari 2027, 07:30 WITA */}
          <div
            aria-label="Hitung Mundur Menuju Upacara Puncak 3 Januari 2027"
            className="bg-[#03251c]/95 border border-emerald-700/60 rounded-xl p-4 sm:p-5 shadow-lg max-w-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300 mb-3">
              {isInlineEditMode && onUpdateBranding ? (
                <>
                  <input
                    type="text"
                    aria-label="Edit Judul Hitung Mundur"
                    value={
                      branding.countdownHeading ?? 'Hitung Mundur Upacara Puncak HAB ke-81'
                    }
                    onChange={(e) =>
                      onUpdateBranding({ countdownHeading: e.target.value })
                    }
                    className="px-2 py-1 rounded bg-[#021b15] border border-dashed border-amber-400 text-xs text-emerald-300 font-semibold flex-1"
                  />
                  <input
                    type="text"
                    aria-label="Edit Label Target Waktu"
                    value={
                      branding.countdownTargetLabel ?? 'Target: 03 Jan 2027 · 07:30 WITA'
                    }
                    onChange={(e) =>
                      onUpdateBranding({ countdownTargetLabel: e.target.value })
                    }
                    className="px-2 py-1 rounded bg-[#021b15] border border-dashed border-amber-400 text-xs text-amber-300 font-mono-tabular w-52"
                  />
                </>
              ) : (
                <>
                  <span className="font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {branding.countdownHeading ?? 'Hitung Mundur Upacara Puncak HAB ke-81'}
                  </span>
                  <span className="font-mono-tabular text-amber-300">
                    {branding.countdownTargetLabel ?? 'Target: 03 Jan 2027 · 07:30 WITA'}
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3 text-center">
              <div className="bg-[#021b15] border border-emerald-800/70 rounded-lg py-2.5 px-2">
                <div
                  data-testid="countdown-days"
                  className="font-mono-tabular text-2xl sm:text-3xl font-bold text-amber-300"
                >
                  {String(countdown.days).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">Hari</div>
              </div>
              <div className="bg-[#021b15] border border-emerald-800/70 rounded-lg py-2.5 px-2">
                <div
                  data-testid="countdown-hours"
                  className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white"
                >
                  {String(countdown.hours).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">Jam</div>
              </div>
              <div className="bg-[#021b15] border border-emerald-800/70 rounded-lg py-2.5 px-2">
                <div
                  data-testid="countdown-minutes"
                  className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white"
                >
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">Menit</div>
              </div>
              <div className="bg-[#021b15] border border-emerald-800/70 rounded-lg py-2.5 px-2">
                <div
                  data-testid="countdown-seconds"
                  className="font-mono-tabular text-2xl sm:text-3xl font-bold text-emerald-400"
                >
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">Detik</div>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigateSection('pendaftaran-lomba')}
              className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-md"
            >
              <Trophy className="w-4 h-4" />
              Daftar Lomba & Porseni
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('jalan-sehat')}
              className="px-4 py-2.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-white border border-emerald-500/40 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              Ambil Kupon QR Jalan Sehat
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('peta-lokasi')}
              className="px-4 py-2.5 rounded-lg bg-[#042f24] hover:bg-emerald-900 text-emerald-200 border border-emerald-700/70 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              Peta GPS & Titik Koordinat
            </button>
          </div>

          {/* Summary KPI Strip (Unboxed clean tabular metrics) */}
          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300 border-t border-emerald-800/60">
            <div>
              <span className="font-mono-tabular font-bold text-amber-300 text-sm">
                {totalCompetitions}
              </span>{' '}
              Cabang Lomba Aktif
            </div>
            <span aria-hidden="true">·</span>
            <div>
              <span className="font-mono-tabular font-bold text-emerald-300 text-sm">
                {totalRegistrations}
              </span>{' '}
              Kontingen/Tim Terdaftar
            </div>
            <span aria-hidden="true">·</span>
            <div>
              <span className="font-mono-tabular font-bold text-amber-300 text-sm">
                {totalCoupons}
              </span>{' '}
              Kupon QR Jalan Sehat
            </div>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-amber-300 hover:text-amber-200 underline underline-offset-4 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Panel Admin Panitia
            </button>
          </div>
        </div>
      </div>

      {/* Unified Collapsible Bottom 3D Control Dock (Solid rgba surface, zero backdrop-filter over WebGL) */}
      <div className="relative z-20 w-full flex flex-col items-center pt-2 pb-6 px-4 pointer-events-none shrink-0">
        <div className="pointer-events-auto flex flex-col items-center max-w-[960px] w-full">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            aria-expanded={!dockCollapsed}
            className="px-3.5 py-1.5 rounded-t-lg bg-[#03221a] border border-b-0 border-emerald-700/70 text-xs font-medium text-emerald-200 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {dockCollapsed ? 'Tampilkan Inspeksi Medali 3D (H)' : 'Sembunyikan Kontrol 3D (H)'}
            </span>
            {dockCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full bg-[#03221a]/95 border border-emerald-700/80 rounded-xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Camera Face Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium mr-1">Sisi Medali:</span>
                <button
                  type="button"
                  onClick={() => setCameraPreset('front_kemenag')}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    cameraPreset === 'front_kemenag'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  Logo Kemenag
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('back_hab81')}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    cameraPreset === 'back_hab81'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  Logo HAB ke-81
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('iso_harmony')}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    cameraPreset === 'iso_harmony'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  Orbit Jalinan
                </button>
              </div>

              {/* Exploded View Slider */}
              <div className="flex items-center gap-2">
                <label htmlFor="medallion-explode-slider" className="text-slate-300 font-medium whitespace-nowrap">
                  Bedah Lapisan 3D:
                </label>
                <input
                  id="medallion-explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedAmount}
                  onChange={(e) => setExplodedAmount( parseFloat(e.target.value) )}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Material Finish Swatches */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium mr-1">Material:</span>
                <button
                  type="button"
                  onClick={() => setFinishPreset('emerald_gold')}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    finishPreset === 'emerald_gold'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  Emas & Zamrud
                </button>
                <button
                  type="button"
                  onClick={() => setFinishPreset('royal_platinum')}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    finishPreset === 'royal_platinum'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  Platina
                </button>
                <button
                  type="button"
                  onClick={() => setFinishPreset('imperial_bronze')}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    finishPreset === 'imperial_bronze'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#021b15] text-slate-300 hover:text-white'
                  }`}
                >
                  Perunggu
                </button>
              </div>

              {/* Ribbon Flow Speed */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium">Pita:</span>
                <button
                  type="button"
                  onClick={() => setRibbonSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.3 : 1))}
                  className="px-2.5 py-1.5 rounded-md bg-[#021b15] hover:bg-emerald-900 text-amber-300 font-mono-tabular font-medium cursor-pointer whitespace-nowrap"
                >
                  {ribbonSpeed}x
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
