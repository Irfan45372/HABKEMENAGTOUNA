import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Competition, ScheduleEvent, VenueArchetype, VenueLocation } from '../types/hab';
import { Calendar, Compass, ExternalLink, MapPin, Navigation, Trophy, Users } from 'lucide-react';

interface VenueMap3DProps {
  venues: VenueLocation[];
  competitions: Competition[];
  schedules: ScheduleEvent[];
  selectedVenueId: string;
  onSelectVenue: (venueId: string) => void;
  onJumpToRegister: (competitionId: string) => void;
}

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _treeDummy = new THREE.Object3D();

/**
 * Builds a composite 5-8 part procedural 3D architectural landmark + interactive beacon pin
 * grounded at bottom-center (y = 0) with a soft radial contact shadow.
 */
function buildVenueLandmarkGroup(
  venue: VenueLocation,
  isSelected: boolean,
  contactShadowTex: THREE.CanvasTexture
): { root: THREE.Group; hitProxy: THREE.Mesh; pinBeacon: THREE.Group } {
  const root = new THREE.Group();
  root.position.set(venue.koordinatX, 0.35, venue.koordinatZ);

  // Soft radial contact shadow disc at ground level (y = 0.02)
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: isSelected ? 0.65 : 0.4,
    })
  );
  shadowMesh.position.y = 0.02;
  root.add(shadowMesh);

  // Shared materials with varied roughness/metalness (>= 0.25 contrast)
  const plinthMat = new THREE.MeshStandardMaterial({
    color: isSelected ? 0x059669 : 0x064e3b,
    roughness: 0.78,
    metalness: 0.15,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.55,
    metalness: 0.1,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: isSelected ? 0xfbbf24 : 0x047857,
    roughness: 0.28,
    metalness: 0.65,
  });
  const goldAccentMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.9,
    clearcoat: 0.5,
  });

  // Part 1: Tiered Foundation Plinth
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.36, 3.2), plinthMat);
  basePlinth.position.y = 0.18;
  root.add(basePlinth);

  const arch: VenueArchetype = venue.archetype || 'kantor_kemenag';

  if (arch === 'kantor_kemenag') {
    // Main office block + twin wings + traditional Limas roof + ceremonial flagpole
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.35, 1.8), wallMat);
    mainHall.position.set(0, 1.03, -0.2);
    root.add(mainHall);

    const portico = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 0.7), wallMat);
    portico.position.set(0, 0.93, 0.9);
    root.add(portico);

    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.1, 4), roofMat);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.position.set(0, 2.25, -0.2);
    root.add(mainRoof);

    // Flagpole in front courtyard
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), goldAccentMat);
    pole.position.set(1.1, 1.4, 1.1);
    root.add(pole);
  } else if (arch === 'masjid_agung') {
    // Sanctuary cube + tiered base + golden onion dome + tall minaret
    const sanctuary = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.4), wallMat);
    sanctuary.position.set(-0.2, 1.06, 0);
    root.add(sanctuary);

    const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.35, 24), plinthMat);
    domeDrum.position.set(-0.2, 1.92, 0);
    root.add(domeDrum);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
      goldAccentMat
    );
    dome.position.set(-0.2, 2.05, 0);
    root.add(dome);

    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.8, 12), wallMat);
    minaret.position.set(1.25, 1.75, 1.0);
    root.add(minaret);

    const minaretSpire = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 12), goldAccentMat);
    minaretSpire.position.set(1.25, 3.45, 1.0);
    root.add(minaretSpire);
  } else if (arch === 'gor_olahraga') {
    // Curved barrel vault stadium roof + side buttresses
    const arenaBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 2.2), wallMat);
    arenaBody.position.set(0, 0.96, 0);
    root.add(arenaBody);

    const vaultRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 3.1, 20, 1, false, 0, Math.PI),
      roofMat
    );
    vaultRoof.rotation.z = Math.PI / 2;
    vaultRoof.position.set(0, 1.56, 0);
    root.add(vaultRoof);

    const entranceArch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.5), goldAccentMat);
    entranceArch.position.set(0, 0.76, 1.2);
    root.add(entranceArch);
  } else if (arch === 'lapangan_utama') {
    // Open coastal festival plaza + main stage arch + twin lighting towers
    const fieldGreen = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.12, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.65, metalness: 0.1 })
    );
    fieldGreen.position.set(0, 0.42, 0);
    root.add(fieldGreen);

    const stageBackdrop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 0.45), roofMat);
    stageBackdrop.position.set(0, 1.05, -0.85);
    root.add(stageBackdrop);

    const stageArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.09, 12, 28, Math.PI),
      goldAccentMat
    );
    stageArch.position.set(0, 0.8, -0.6);
    root.add(stageArch);
  } else {
    // Aula Kerukunan / Kepulauan Harbor Pavilion
    const pavilion = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.25, 2.0), wallMat);
    pavilion.position.set(0, 0.98, 0);
    root.add(pavilion);

    const hipRoof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 0.95, 4), roofMat);
    hipRoof.rotation.y = Math.PI / 4;
    hipRoof.position.set(0, 2.08, 0);
    root.add(hipRoof);

    const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldAccentMat);
    spire.position.set(0, 2.75, 0);
    root.add(spire);
  }

  // Elevated Interactive Pin Beacon above the landmark
  const pinBeacon = new THREE.Group();
  pinBeacon.position.set(0, 3.85, 0);

  const pinStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.02, 1.1, 12),
    goldAccentMat
  );
  pinStem.position.y = -0.45;
  pinBeacon.add(pinStem);

  const pinHead = new THREE.Mesh(
    new THREE.OctahedronGeometry(isSelected ? 0.58 : 0.42, 0),
    new THREE.MeshPhysicalMaterial({
      color: isSelected ? 0xfbbf24 : 0x10b981,
      emissive: isSelected ? 0xd97706 : 0x047857,
      emissiveIntensity: isSelected ? 0.55 : 0.25,
      metalness: 0.85,
      roughness: 0.15,
    })
  );
  pinBeacon.add(pinHead);

  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(isSelected ? 0.82 : 0.58, 0.04, 12, 32),
    goldAccentMat
  );
  haloRing.rotation.x = Math.PI / 2;
  pinBeacon.add(haloRing);

  root.add(pinBeacon);

  // Invisible simplified proxy collision box for fast, reliable raycasting
  const hitProxy = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 5.2, 4.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitProxy.position.y = 2.4;
  hitProxy.userData = { venueId: venue.id };
  root.add(hitProxy);

  return { root, hitProxy, pinBeacon };
}

export const VenueMap3D: React.FC<VenueMap3DProps> = ({
  venues,
  competitions,
  schedules,
  selectedVenueId,
  onSelectVenue,
  onJumpToRegister,
}) => {
  const mapMountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<'3d' | 'gps'>('3d');

  const activeVenue =
    venues.find((v) => v.id === selectedVenueId) || venues[0] || null;

  const activeGpsString =
    activeVenue?.koordinatGps ||
    (typeof activeVenue?.latitude === 'number' && typeof activeVenue?.longitude === 'number'
      ? `${activeVenue.latitude}, ${activeVenue.longitude}`
      : '-0.9125845029778236, 121.58667527394272');

  const activeGpsQuery =
    typeof activeVenue?.latitude === 'number' && typeof activeVenue?.longitude === 'number'
      ? `${activeVenue.latitude},${activeVenue.longitude}`
      : activeVenue?.koordinatGps?.replace(/\s+/g, '') ||
        '-0.9125845029778236,121.58667527394272';

  const venueCompetitions = competitions.filter(
    (c) => c.lokasiId === activeVenue?.id
  );
  const venueSchedules = schedules.filter(
    (s) =>
      s.lokasiId === activeVenue?.id ||
      (activeVenue &&
        s.lokasiNama.toLowerCase().includes(activeVenue.nama.toLowerCase().slice(0, 12)))
  );

  // Keep latest callbacks & props in ref for the Three.js scene
  const sceneSyncRef = useRef<{
    rebuildPins?: (vList: VenueLocation[], selId: string) => void;
    focusVenue?: (v: VenueLocation | null) => void;
    onSelectVenue: (id: string) => void;
  }>({
    onSelectVenue,
  });

  useEffect(() => {
    sceneSyncRef.current.onSelectVenue = onSelectVenue;
  }, [onSelectVenue]);

  useEffect(() => {
    sceneSyncRef.current.rebuildPins?.(venues, selectedVenueId);
    const found = venues.find((v) => v.id === selectedVenueId) || null;
    sceneSyncRef.current.focusVenue?.(found);
  }, [venues, selectedVenueId]);

  useEffect(() => {
    const container = mapMountRef.current;
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

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03221a);
    scene.fog = new THREE.FogExp2(0x03221a, 0.014);

    // 2.5D Isometric Camera Angle
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.5, 220);
    camera.position.set(0, 32, 38);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment Map
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x022c22, 0.95);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(18, 34, 22);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 28;
    sunLight.shadow.camera.bottom = -28;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // =========================================================================
    // KABUPATEN TOJO UNA-UNA 2.5D ARCHIPELAGO & MAINLAND TERRAIN
    // =========================================================================
    // 1. Teluk Tomini Deep Emerald-Teal Sea Plane
    const seaGeo = new THREE.PlaneGeometry(160, 120);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x04392e,
      roughness: 0.25,
      metalness: 0.45,
    });
    const seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.position.y = -0.15;
    scene.add(seaMesh);

    // 2. Ampana Mainland Coastal Plateau (Left & Center)
    const mainlandShape = new THREE.Shape();
    mainlandShape.moveTo(-34, -18);
    mainlandShape.lineTo(18, -16);
    mainlandShape.quadraticCurveTo(22, -4, 12, 12);
    mainlandShape.quadraticCurveTo(2, 17, -14, 15);
    mainlandShape.quadraticCurveTo(-30, 14, -34, -2);
    mainlandShape.closePath();

    const mainlandGeo = new THREE.ExtrudeGeometry(mainlandShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.25,
      bevelSegments: 2,
    });
    mainlandGeo.rotateX(Math.PI / 2);
    const landMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.82,
      metalness: 0.08,
    });
    const mainlandMesh = new THREE.Mesh(mainlandGeo, landMat);
    mainlandMesh.position.y = 0.35;
    mainlandMesh.receiveShadow = !isSoftwareGl;
    scene.add(mainlandMesh);

    // 3. Kepulauan Togean / Una-Una / Walea Island Cluster (East/Right)
    const islandShape = new THREE.Shape();
    islandShape.moveTo(16, 2);
    islandShape.quadraticCurveTo(26, 0, 29, 7);
    islandShape.quadraticCurveTo(27, 14, 19, 12);
    islandShape.quadraticCurveTo(14, 9, 16, 2);

    const islandGeo = new THREE.ExtrudeGeometry(islandShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.2,
      bevelSegments: 2,
    });
    islandGeo.rotateX(Math.PI / 2);
    const islandMesh = new THREE.Mesh(islandGeo, landMat);
    islandMesh.position.y = 0.35;
    scene.add(islandMesh);

    // 4. Curved Golden Highway & Sea Ferry Route connecting Ampana & Kepulauan Togean
    const roadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22, 0.42, 9),
      new THREE.Vector3(-12, 0.42, -4),
      new THREE.Vector3(-4, 0.42, -11),
      new THREE.Vector3(14, 0.42, -7),
      new THREE.Vector3(4, 0.42, 8),
      new THREE.Vector3(21, 0.42, 6),
    ]);
    const roadGeo = new THREE.TubeGeometry(roadCurve, 64, 0.22, 8, false);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.4,
      metalness: 0.65,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    scene.add(roadMesh);

    // 5. InstancedMesh of 40 Tropical Coastal Trees across Ampana & Togean
    const treeCoords: [number, number][] = [
      [-28, -8], [-26, 2], [-18, -12], [-15, 4], [-8, 11],
      [-2, -3], [6, -12], [9, 2], [18, -12], [-25, 13],
      [-19, -2], [-9, -14], [1, 13], [11, -2], [24, 3],
      [26, 9], [18, 10], [-29, 7], [-14, -9], [7, -4],
      [-24, -5], [-16, 11], [-6, 5], [3, -8], [15, -1],
      [22, 11], [-20, 6], [-11, 1], [-1, 8], [12, -11],
    ];
    const treeCrownGeo = new THREE.ConeGeometry(0.55, 1.35, 7);
    const treeCrownMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.75,
      metalness: 0.05,
    });
    const treesInstanced = new THREE.InstancedMesh(
      treeCrownGeo,
      treeCrownMat,
      treeCoords.length
    );
    const c1 = new THREE.Color(0x10b981);
    const c2 = new THREE.Color(0x059669);
    treeCoords.forEach(([tx, tz], idx) => {
      const scale = 0.85 + ((idx * 17) % 30) / 100;
      _treeDummy.position.set(tx, 0.35 + 0.65 * scale, tz);
      _treeDummy.rotation.set(0, idx * 0.8, 0);
      _treeDummy.scale.setScalar(scale);
      _treeDummy.updateMatrix();
      treesInstanced.setMatrixAt(idx, _treeDummy.matrix);
      treesInstanced.setColorAt(idx, idx % 2 === 0 ? c1 : c2);
    });
    treesInstanced.instanceMatrix.needsUpdate = true;
    if (treesInstanced.instanceColor) treesInstanced.instanceColor.needsUpdate = true;
    treesInstanced.computeBoundingSphere();
    scene.add(treesInstanced);

    // Contact shadow texture shared by all landmarks
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    sGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
    sGrad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 64, 64);
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);

    // Dynamic Venue Landmarks Container
    const landmarksGroup = new THREE.Group();
    scene.add(landmarksGroup);

    let hitProxies: THREE.Mesh[] = [];
    let animatedBeacons: THREE.Group[] = [];

    const rebuildPins = (vList: VenueLocation[], selId: string) => {
      while (landmarksGroup.children.length > 0) {
        landmarksGroup.remove(landmarksGroup.children[0]);
      }
      hitProxies = [];
      animatedBeacons = [];

      for (const v of vList) {
        const isSel = v.id === selId;
        const { root, hitProxy, pinBeacon } = buildVenueLandmarkGroup(
          v,
          isSel,
          contactShadowTex
        );
        landmarksGroup.add(root);
        hitProxies.push(hitProxy);
        animatedBeacons.push(pinBeacon);
      }
    };

    sceneSyncRef.current.rebuildPins = rebuildPins;
    rebuildPins(venues, selectedVenueId);

    // Smooth camera target focus when a venue is selected
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetCamPos = new THREE.Vector3(0, 32, 38);

    sceneSyncRef.current.focusVenue = (v: VenueLocation | null) => {
      if (!v) {
        targetLookAt.set(0, 0, 0);
        targetCamPos.set(0, 32, 38);
      } else {
        targetLookAt.set(v.koordinatX * 0.45, 0.5, v.koordinatZ * 0.45);
        targetCamPos.set(v.koordinatX * 0.35, 29, 34 + v.koordinatZ * 0.3);
      }
    };

    const initialSel = venues.find((v) => v.id === selectedVenueId) || venues[0] || null;
    sceneSyncRef.current.focusVenue(initialSel);

    // Raycasting on canvas click & hover
    const getHitVenueId = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, camera);
      const intersects = _raycaster.intersectObjects(hitProxies, false);
      if (intersects.length > 0) {
        return intersects[0].object.userData?.venueId || null;
      }
      return null;
    };

    const onCanvasClick = (e: MouseEvent) => {
      const hitId = getHitVenueId(e.clientX, e.clientY);
      if (hitId) {
        sceneSyncRef.current.onSelectVenue(hitId);
      }
    };

    let lastHoverCheck = 0;
    const onCanvasMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastHoverCheck < 60) return;
      lastHoverCheck = now;
      const hitId = getHitVenueId(e.clientX, e.clientY);
      setHoveredVenueId(hitId);
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('mousemove', onCanvasMove);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Paced Animation Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
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
    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      elapsed += dt;

      // Exponentially damp camera position and lookAt target
      const alpha = 1 - Math.exp(-4.5 * dt);
      camera.position.lerp(targetCamPos, alpha);
      currentLookAt.lerp(targetLookAt, alpha);
      camera.lookAt(currentLookAt);

      // Gentle rotation & bobbing on venue beacons
      for (let i = 0; i < animatedBeacons.length; i++) {
        const b = animatedBeacons[i];
        b.rotation.y = elapsed * 1.4 + i;
        b.position.y = 3.85 + Math.sin(elapsed * 2.2 + i) * 0.16;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', onCanvasClick);
      renderer.domElement.removeEventListener('mousemove', onCanvasMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <section
      id="peta-lokasi"
      aria-label="Peta Interaktif 2.5D Lokasi Acara Kabupaten Tojo Una-Una"
      className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-emerald-900/70"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-amber-300 tracking-wide mb-1">
            01. Geospasial & Titik Pelaksanaan HAB ke-81
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white [text-wrap:balance]">
            Peta Interaktif 2.5D Lokasi & Venue Kabupaten Tojo Una-Una
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
            Klik pin bangunan 3D di atas peta daratan Ampana & Kepulauan Togean atau pilih titik lokasi di bawah untuk melihat jadwal pertandingan, acara aktif, dan rute Google Maps.
          </p>
        </div>

        {/* Accessible Venue Selector Strip */}
        <div
          role="tablist"
          aria-label="Daftar Lokasi Venue HAB ke-81"
          className="flex flex-wrap items-center gap-1.5 bg-[#03221a] p-1.5 rounded-xl border border-emerald-800/80"
        >
          {venues.map((v) => {
            const isSelected = v.id === activeVenue?.id;
            const shortLabel = v.nama.includes('(')
              ? v.nama.split('(')[0].trim()
              : v.nama.split('&')[0].trim();
            return (
              <button
                key={v.id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => onSelectVenue(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-emerald-900/50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split: Left 2.5D Isometric Canvas, Right Dynamic Venue Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: 2.5D Isometric Three.js Viewport + Interactive GPS Map Switcher */}
        <div className="lg:col-span-7 relative min-h-[420px] sm:min-h-[480px] rounded-2xl overflow-hidden border border-emerald-800/80 bg-[#03221a] flex flex-col justify-between">
          {/* 3D WebGL Canvas (kept mounted so camera state persists smoothly) */}
          <div
            ref={mapMountRef}
            data-testid="venue-map-3d-canvas"
            className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-200 ${
              mapViewMode === '3d' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Interactive GPS Google Maps Embed when switched to 'gps' mode */}
          {mapViewMode === 'gps' && (
            <iframe
              title={`Peta GPS Interaktif ${activeVenue?.nama || 'Kantor Kemenag Kab. Tojo Una-Una'}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(activeGpsQuery)}&hl=id&z=17&output=embed`}
              className="absolute inset-0 w-full h-full z-0 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}

          {/* Top Map Bar: Legend & 3D / GPS Interactive Map Toggle */}
          <div className="relative z-10 p-3.5 pointer-events-none flex flex-wrap items-center justify-between gap-2">
            <div className="bg-[#021b15]/95 border border-emerald-700/70 rounded-lg px-3 py-1.5 text-xs text-emerald-200 flex items-center gap-2 pointer-events-auto">
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono-tabular">GPS: {activeGpsString}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#021b15]/95 border border-emerald-700/80 p-1 rounded-lg pointer-events-auto">
              <button
                type="button"
                onClick={() => setMapViewMode('3d')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  mapViewMode === '3d'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                Peta 2.5D 3D
              </button>
              <button
                type="button"
                onClick={() => setMapViewMode('gps')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  mapViewMode === 'gps'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                Peta GPS Satelit/Maps
              </button>
            </div>
          </div>

          {/* Bottom Interactive Venue Quick-Jump Bar */}
          <div className="relative z-10 p-3 bg-[#021b15]/95 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-300 truncate">
              Lokasi Terpilih:{' '}
              <strong className="text-amber-300">{activeVenue?.nama || '-'}</strong>
            </div>
            <div className="font-mono-tabular text-emerald-300 shrink-0">
              Titik Koordinat: {activeGpsString}
            </div>
          </div>
        </div>

        {/* Right: Selected Venue Details, Active Competitions & Schedule */}
        <div className="lg:col-span-5 bg-[#03251c] border border-emerald-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-5">
          {activeVenue ? (
            <>
              <div className="space-y-4">
                <div className="border-b border-emerald-800/70 pb-4">
                  <div className="text-xs text-amber-300 font-medium mb-1">
                    Titik Pelaksanaan Resmi · Kapasitas {activeVenue.kapasitas}
                  </div>
                  <h3
                    data-testid="selected-venue-title"
                    className="text-xl font-bold text-white"
                  >
                    {activeVenue.nama}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{activeVenue.alamat}</p>
                  <div className="mt-2 inline-flex items-center gap-2 bg-[#021b15] border border-emerald-800/80 rounded-lg px-2.5 py-1 text-[11px] font-mono-tabular text-emerald-300">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Koordinat GPS: {activeGpsString}</span>
                  </div>
                  <p className="text-sm text-slate-200 mt-3 leading-relaxed">
                    {activeVenue.deskripsi}
                  </p>
                </div>

                {/* Active Competitions at this Venue */}
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300 mb-2.5 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Cabang Lomba di Lokasi Ini ({venueCompetitions.length})
                  </h4>
                  {venueCompetitions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Belum ada cabang lomba spesifik di titik ini (fokus acara seremonial/sosial).
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {venueCompetitions.map((comp) => (
                        <div
                          key={comp.id}
                          className="bg-[#021b15] border border-emerald-800/60 rounded-lg p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {comp.nama}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {comp.kategori} · {comp.jenisPeserta} · {comp.jadwalRingkas}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onJumpToRegister(comp.id)}
                            className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-amber-200 text-[11px] font-medium shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            Daftar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Schedule Events at this Venue */}
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300 mb-2.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Agenda & Jadwal Rangkaian Acara ({venueSchedules.length})
                  </h4>
                  {venueSchedules.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Jadwal detail untuk lokasi ini dapat ditambahkan melalui Panel Admin.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {venueSchedules.map((sch) => (
                        <div
                          key={sch.id}
                          className="bg-[#021b15] border border-emerald-800/60 rounded-lg p-2.5"
                        >
                          <div className="text-xs font-semibold text-white">{sch.judul}</div>
                          <div className="text-[11px] text-amber-300/90 mt-0.5 font-mono-tabular">
                            {sch.tanggal} · {sch.waktu} · Status: {sch.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Google Maps Action Link */}
              <div className="pt-3 border-t border-emerald-800/70 flex items-center justify-between gap-3">
                <a
                  href={activeVenue.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Buka Petunjuk Arah di Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pilih salah satu lokasi di peta.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
