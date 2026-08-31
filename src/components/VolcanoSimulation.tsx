import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { EruptionStage, ERUPTION_STAGES, LiveMetrics } from '../types';
import { Play, Pause, Eye, Layers, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Compass } from 'lucide-react';

interface VolcanoSimulationProps {
  currentStage: EruptionStage;
  setCurrentStage: (stage: EruptionStage) => void;
  crossSection: boolean;
  setCrossSection: (val: boolean) => void;
  metrics: LiveMetrics;
  isSimulationPlaying: boolean;
  setIsSimulationPlaying: (val: boolean) => void;
  isVrActive: boolean;
  setIsVrActive: (val: boolean) => void;
}

export default function VolcanoSimulation({
  currentStage,
  setCurrentStage,
  crossSection,
  setCrossSection,
  metrics,
  isSimulationPlaying,
  setIsSimulationPlaying,
  isVrActive,
  setIsVrActive
}: VolcanoSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const requestRef = useRef<number | null>(null);

  // WebXR locomotion & diorama group references
  const dioramaGroupRef = useRef<THREE.Group | null>(null);
  const vrConsoleGroupRef = useRef<THREE.Group | null>(null);
  const cameraGroupRef = useRef<THREE.Group | null>(null);

  // References to keep state updated in the WebXR animation loop without re-triggering scene reconstruction
  const currentStageRef = useRef<EruptionStage>(currentStage);
  const crossSectionRef = useRef<boolean>(crossSection);
  const isSimulationPlayingRef = useRef<boolean>(isSimulationPlaying);
  const metricsRef = useRef<LiveMetrics>(metrics);

  const beaconPointLightRef = useRef<THREE.PointLight | null>(null);
  const beaconMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  useEffect(() => {
    crossSectionRef.current = crossSection;
  }, [crossSection]);

  useEffect(() => {
    isSimulationPlayingRef.current = isSimulationPlaying;
  }, [isSimulationPlaying]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // 3D Objects refs for animation
  const mountainFullRef = useRef<THREE.Mesh | null>(null);
  const mountainCutRef = useRef<THREE.Mesh | null>(null);
  const flatCutFaceRef = useRef<THREE.Mesh | null>(null);
  const lavaCraterRef = useRef<THREE.Mesh | null>(null);
  const magmaChamberRef = useRef<THREE.Mesh | null>(null);
  const conduitRef = useRef<THREE.Mesh | null>(null);
  const eruptionPointLightRef = useRef<THREE.PointLight | null>(null);
  
  // Particle Systems refs
  const ashParticlesRef = useRef<THREE.Points | null>(null);
  const bombParticlesRef = useRef<THREE.Points | null>(null);
  const lavaFlowParticlesRef = useRef<THREE.Points | null>(null);
  const fumaroleParticlesRef = useRef<THREE.Points | null>(null);
  const magmaRisingParticlesRef = useRef<THREE.Points | null>(null);

  const [cameraPositionInfo, setCameraPositionInfo] = useState({ x: 0, y: 12, z: 22 });
  const [showHelperLabels, setShowHelperLabels] = useState(true);

  // Helper to create round glow texture procedurally
  const createCircleTexture = (color: string, size = 64) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  // Helper to draw geological layers canvas for cut face
  const createGeologicalCutTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Background - grey dark rock
    ctx.fillStyle = '#2b2625';
    ctx.fillRect(0, 0, 512, 512);

    // Draw wavy geological layers (older ash and lava flows layered over millions of years)
    const drawLayer = (yStart: number, height: number, color: string, waveAmp: number, waveFreq: number) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, yStart);
      for (let x = 0; x <= 512; x++) {
        const y = yStart + Math.sin(x * waveFreq) * waveAmp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(512, yStart + height + 50);
      ctx.lineTo(0, yStart + height + 50);
      ctx.closePath();
      ctx.fill();
    };

    // Layer stack (bottom to top)
    drawLayer(450, 80, '#151212', 15, 0.02); // Deep basement basalt
    drawLayer(380, 70, '#36302e', 10, 0.03); // Tuff layer
    drawLayer(300, 80, '#423b38', 12, 0.015); // Ancient basalt flow
    drawLayer(220, 80, '#594f4b', 18, 0.025); // Ash fall deposit
    drawLayer(140, 80, '#4d4340', 8, 0.04);  // Pyroclastic layer
    drawLayer(60, 80, '#695d58', 14, 0.035); // Recent andesite flows

    // Outline/Texture noise
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      ctx.fillRect(rx, ry, size, size);
    }

    // Central conduit tunnel (to be drawn in 3D instead, but we add a dark outline on the texture for depth)
    ctx.fillStyle = '#100c0c';
    ctx.fillRect(236, 120, 40, 392); // central conduit pathway
    
    // Bottom magma chamber outline
    const gradChamber = ctx.createRadialGradient(256, 400, 10, 256, 400, 90);
    gradChamber.addColorStop(0, '#1c1110');
    gradChamber.addColorStop(1, '#2b2625');
    ctx.fillStyle = gradChamber;
    ctx.beginPath();
    ctx.arc(256, 400, 90, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#bae6fd'); // Tropical daylight sky blue
    scene.fog = new THREE.FogExp2('#bae6fd', 0.012); // Fog blending with the sky
    sceneRef.current = scene;

    // --- Camera Setup ---
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(cameraPositionInfo.x, cameraPositionInfo.y, cameraPositionInfo.z);
    cameraRef.current = camera;

    // --- Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable WebXR for Quest 3 support
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    // Clean previous content
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Add WebXR VR button if VR is supported or just inject it
    const vrButton = VRButton.createButton(renderer);
    vrButton.style.position = 'absolute';
    vrButton.style.bottom = '16px';
    vrButton.style.left = '50%';
    vrButton.style.transform = 'translateX(-50%)';
    vrButton.style.background = 'rgba(15, 23, 42, 0.8)';
    vrButton.style.border = '1px solid #ef4444';
    vrButton.style.color = '#ef4444';
    vrButton.style.borderRadius = '8px';
    vrButton.style.fontFamily = 'monospace';
    vrButton.style.fontWeight = 'bold';
    vrButton.style.fontSize = '12px';
    vrButton.style.padding = '8px 16px';
    vrButton.id = 'webxr-vr-button';
    containerRef.current.appendChild(vrButton);

    // --- VR and Diorama Groups Setup ---
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);
    dioramaGroupRef.current = dioramaGroup;

    const vrConsoleGroup = new THREE.Group();
    vrConsoleGroup.visible = false; // Hidden when not in VR
    scene.add(vrConsoleGroup);
    vrConsoleGroupRef.current = vrConsoleGroup;

    // Camera Group (User Rig) Setup for smooth locomotion and camera positioning
    const cameraGroup = new THREE.Group();
    scene.add(cameraGroup);
    cameraGroupRef.current = cameraGroup;
    cameraGroup.add(camera);

    // Set up VR controllers
    const controller1 = renderer.xr.getController(0);
    cameraGroup.add(controller1);
    const controller2 = renderer.xr.getController(1);
    cameraGroup.add(controller2);

    const controllerGrip1 = renderer.xr.getControllerGrip(0);
    const controllerGrip2 = renderer.xr.getControllerGrip(1);
    cameraGroup.add(controllerGrip1);
    cameraGroup.add(controllerGrip2);

    // Draw simple cylindrical controller models (wand handles)
    const gripGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.15, 8);
    gripGeo.rotateX(Math.PI / 2);
    const gripMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.8 });
    const gripMesh1 = new THREE.Mesh(gripGeo, gripMat);
    controllerGrip1.add(gripMesh1);
    const gripMesh2 = new THREE.Mesh(gripGeo, gripMat);
    controllerGrip2.add(gripMesh2);

    // Raycast laser pointers for buttons target selection
    const laserGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -6)
    ]);
    const laserMaterial = new THREE.LineBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.6
    });

    const line1 = new THREE.Line(laserGeometry, laserMaterial.clone());
    line1.name = 'laser';
    controller1.add(line1);

    const line2 = new THREE.Line(laserGeometry, laserMaterial.clone());
    line2.name = 'laser';
    controller2.add(line2);

    // Helper to create high-contrast label textures for the buttons
    const createTextLabel = (text: string, color: string, width = 256, height = 128) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.CanvasTexture(canvas);

      // Dark plate background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Tech border
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, width - 8, height - 8);

      // Text label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const interactiveButtons: THREE.Mesh[] = [];

    // Constructing the VR nuclear power control panel desk
    const pillarGeo = new THREE.BoxGeometry(0.5, 0.85, 0.3);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, metalness: 0.3 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(0, -0.425, 0);
    vrConsoleGroup.add(pillar);

    const deskGeo = new THREE.BoxGeometry(1.6, 0.08, 0.5);
    const deskMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.7, metalness: 0.4 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0, 0);
    vrConsoleGroup.add(desk);

    const boardGeo = new THREE.BoxGeometry(1.5, 0.02, 0.4);
    const board = new THREE.Mesh(boardGeo, deskMat);
    board.position.set(0, 0.04, 0);
    board.rotation.x = -Math.PI / 12; // tilt towards player
    vrConsoleGroup.add(board);

    const ringGeo = new THREE.CylinderGeometry(0.05, 0.052, 0.015, 16);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });

    const plungerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16);

    const createConsoleButton = (name: string, label: string, color: string, x: number, z: number, action: () => void) => {
      const btnGroup = new THREE.Group();
      btnGroup.position.set(x, 0.02, z);
      
      const ring = new THREE.Mesh(ringGeo, ringMat);
      btnGroup.add(ring);
      
      const plungerMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const plunger = new THREE.Mesh(plungerGeo, plungerMat);
      plunger.position.y = 0.0125;
      plunger.userData = { buttonId: name, label: label, action: action, originalY: 0.0125 };
      btnGroup.add(plunger);
      interactiveButtons.push(plunger);
      
      const labelTexture = createTextLabel(label, color, 256, 128);
      const labelGeo = new THREE.PlaneGeometry(0.16, 0.08);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, side: THREE.DoubleSide });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, 0.01, -0.075);
      labelMesh.rotation.x = -Math.PI / 2;
      btnGroup.add(labelMesh);
      
      board.add(btnGroup);
    };

    // Stage control buttons
    createConsoleButton('dormant', 'DORMANT', '#3b82f6', -0.5, 0.05, () => {
      setCurrentStage(EruptionStage.DORMANT);
    });
    createConsoleButton('tremor', 'TREMOR', '#10b981', -0.25, 0.05, () => {
      setCurrentStage(EruptionStage.PRESSURIZATION);
    });
    createConsoleButton('effusive', 'EFFUSIVE', '#f97316', 0.0, 0.05, () => {
      setCurrentStage(EruptionStage.EFFUSIVE);
    });
    createConsoleButton('explosive', 'EXPLOSIVE', '#ef4444', 0.25, 0.05, () => {
      setCurrentStage(EruptionStage.EXPLOSIVE);
    });
    createConsoleButton('collapse', 'COLLAPSE', '#06b6d4', 0.5, 0.05, () => {
      setCurrentStage(EruptionStage.COLLAPSE);
    });

    // Utility buttons
    createConsoleButton('cross_section', 'CUT VIEW', '#a855f7', -0.2, -0.08, () => {
      setCrossSection(!crossSectionRef.current);
    });
    createConsoleButton('play_pause', 'PLAY/PAUSE', '#14b8a6', 0.2, -0.08, () => {
      setIsSimulationPlaying(!isSimulationPlayingRef.current);
    });

    // --- Warning Alarm Light Beacon (Siren) Setup ---
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0, 0.04, -0.16); // centered at the back of the board
    board.add(beaconGroup);

    const beaconBaseGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.02, 16);
    const beaconBaseMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.8 });
    const beaconBase = new THREE.Mesh(beaconBaseGeo, beaconBaseMat);
    beaconGroup.add(beaconBase);

    const beaconDomeGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.055, 16);
    const beaconDomeMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1
    });
    const beaconDome = new THREE.Mesh(beaconDomeGeo, beaconDomeMat);
    beaconDome.position.y = 0.035;
    beaconGroup.add(beaconDome);
    beaconMatRef.current = beaconDomeMat;

    const beaconPointLight = new THREE.PointLight('#ef4444', 0, 5, 1.2);
    beaconPointLight.position.set(0, 0.035, 0);
    beaconGroup.add(beaconPointLight);
    beaconPointLightRef.current = beaconPointLight;

    // --- Live Telemetry Screens Setup ---
    const leftCanvas = document.createElement('canvas');
    leftCanvas.width = 512;
    leftCanvas.height = 384;
    const leftCtx = leftCanvas.getContext('2d');
    const leftTexture = new THREE.CanvasTexture(leftCanvas);
    leftTexture.colorSpace = THREE.SRGBColorSpace;

    const rightCanvas = document.createElement('canvas');
    rightCanvas.width = 512;
    rightCanvas.height = 384;
    const rightCtx = rightCanvas.getContext('2d');
    const rightTexture = new THREE.CanvasTexture(rightCanvas);
    rightTexture.colorSpace = THREE.SRGBColorSpace;

    // Left Monitor
    const leftMonitorGroup = new THREE.Group();
    leftMonitorGroup.position.set(-0.68, 0.01, -0.05);
    leftMonitorGroup.rotation.set(-Math.PI / 18, Math.PI / 8, 0); // tilted up & slightly rotated towards center
    board.add(leftMonitorGroup);

    const standGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12);
    const standMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.7 });
    const leftStand = new THREE.Mesh(standGeo, standMat);
    leftStand.position.y = 0.08;
    leftMonitorGroup.add(leftStand);

    const screenHousingGeo = new THREE.BoxGeometry(0.44, 0.33, 0.015);
    const housingMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.5 });
    const leftHousing = new THREE.Mesh(screenHousingGeo, housingMat);
    leftHousing.position.set(0, 0.18, 0);
    leftMonitorGroup.add(leftHousing);

    const screenGeo = new THREE.PlaneGeometry(0.42, 0.31);
    const leftScreenMat = new THREE.MeshBasicMaterial({ map: leftTexture });
    const leftScreenMesh = new THREE.Mesh(screenGeo, leftScreenMat);
    leftScreenMesh.position.set(0, 0.18, 0.009); // slightly offset forward
    leftMonitorGroup.add(leftScreenMesh);

    // Right Monitor
    const rightMonitorGroup = new THREE.Group();
    rightMonitorGroup.position.set(0.68, 0.01, -0.05);
    rightMonitorGroup.rotation.set(-Math.PI / 18, -Math.PI / 8, 0); // tilted up & rotated towards center
    board.add(rightMonitorGroup);

    const rightStand = new THREE.Mesh(standGeo, standMat);
    rightStand.position.y = 0.08;
    rightMonitorGroup.add(rightStand);

    const rightHousing = new THREE.Mesh(screenHousingGeo, housingMat);
    rightHousing.position.set(0, 0.18, 0);
    rightMonitorGroup.add(rightHousing);

    const rightScreenMat = new THREE.MeshBasicMaterial({ map: rightTexture });
    const rightScreenMesh = new THREE.Mesh(screenGeo, rightScreenMat);
    rightScreenMesh.position.set(0, 0.18, 0.009);
    rightMonitorGroup.add(rightScreenMesh);

    // VR Observation Deck floor
    const deckFloorGeo = new THREE.CylinderGeometry(3.0, 3.2, 0.1, 8);
    const deckFloorMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.4,
      metalness: 0.8
    });
    const deckFloor = new THREE.Mesh(deckFloorGeo, deckFloorMat);
    deckFloor.position.set(0, -0.05, -0.5);
    vrConsoleGroup.add(deckFloor);

    // Protective industrial safety handrails around the VR observation tower
    const railGroup = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.3, metalness: 0.8 });
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 3;
      const z = Math.sin(angle) * 3 - 0.5;
      
      if (z < -1.5 && z > -2.5) continue; 
      
      const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8);
      const pole = new THREE.Mesh(poleGeo, railMat);
      pole.position.set(x, 0.5, z);
      railGroup.add(pole);
    }
    
    const torusGeo = new THREE.TorusGeometry(3, 0.025, 8, 24, Math.PI * 1.5);
    const handrail = new THREE.Mesh(torusGeo, railMat);
    handrail.rotation.x = Math.PI / 2;
    handrail.rotation.z = Math.PI / 4; // open side towards volcano
    handrail.position.set(0, 1.0, -0.5);
    railGroup.add(handrail);
    vrConsoleGroup.add(railGroup);

    // Raycast controller selection callback
    const onSelectStart = (event: THREE.Event) => {
      const controller = event.target as THREE.XRTargetRaySpace;
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);

      const raycaster = new THREE.Raycaster();
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const intersects = raycaster.intersectObjects(interactiveButtons);
      if (intersects.length > 0) {
        const clickedPlunger = intersects[0].object as THREE.Mesh;
        
        // Haptics if possible
        try {
          const session = renderer.xr.getSession();
          if (session) {
            for (const source of session.inputSources) {
              if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators[0]) {
                source.gamepad.hapticActuators[0].pulse(0.8, 40);
              }
            }
          }
        } catch (e) {}

        clickedPlunger.position.y = 0.002;
        const pMat = clickedPlunger.material as THREE.MeshStandardMaterial;
        pMat.emissiveIntensity = 4.0;

        if (clickedPlunger.userData.action) {
          clickedPlunger.userData.action();
        }
      }
    };

    controller1.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectstart', onSelectStart);

    // Listen to XR session start/end to configure views
    renderer.xr.addEventListener('sessionstart', () => {
      setIsVrActive(true);
      if (controlsRef.current) controlsRef.current.enabled = false;
      
      // Position the volcano island far away from user to allow fully viewable beautiful island setting
      if (dioramaGroupRef.current) {
        dioramaGroupRef.current.position.set(0, -1.8, -22.0); // Placed further away to avoid crowding
        dioramaGroupRef.current.rotation.set(0, 0, 0); // Reset rotation so the cut face is pointing directly at the player!
        dioramaGroupRef.current.scale.set(1.0, 1.0, 1.0);
      }
      
      // Position nuclear controls console at hand-level in front of starting rig
      if (vrConsoleGroupRef.current) {
        vrConsoleGroupRef.current.position.set(0, 0.85, -1.2);
        vrConsoleGroupRef.current.visible = true;
      }

      // Initialize user rig at zero coordinates
      if (cameraGroupRef.current) {
        cameraGroupRef.current.position.set(0, 0, 0);
        cameraGroupRef.current.rotation.set(0, 0, 0);
      }
    });

    renderer.xr.addEventListener('sessionend', () => {
      setIsVrActive(false);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
      
      if (dioramaGroupRef.current) {
        dioramaGroupRef.current.position.set(0, 0, 0);
        dioramaGroupRef.current.scale.set(1.0, 1.0, 1.0);
      }
      
      if (vrConsoleGroupRef.current) {
        vrConsoleGroupRef.current.visible = false;
      }

      if (cameraGroupRef.current) {
        cameraGroupRef.current.position.set(0, 0, 0);
        cameraGroupRef.current.rotation.set(0, 0, 0);
      }
    });

    // --- Orbit Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
    controls.minDistance = 6;
    controls.maxDistance = 60;
    controls.target.set(0, 3, 0);
    controlsRef.current = controls;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight('#e0f2fe', 0.85); // bright tropical daylight light
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.25); // bright warm yellow sun
    sunLight.position.set(15, 25, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 80;
    const d = 15;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Eruption glow light (at volcano crater)
    const eruptionPointLight = new THREE.PointLight('#ff5500', 0, 40, 1.5);
    eruptionPointLight.position.set(0, 7.2, 0);
    dioramaGroup.add(eruptionPointLight);
    eruptionPointLightRef.current = eruptionPointLight;

    // --- Ground Grid / Base ---
    // (Removed gridHelper to make the ocean look completely pristine and natural)

    // --- Tropical Island Sea & Shore Base ---
    const beachGeo = new THREE.CircleGeometry(14, 36);
    const beachMat = new THREE.MeshStandardMaterial({ color: '#eccfa2', roughness: 0.9 });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.y = 0.01;
    beach.receiveShadow = true;
    dioramaGroup.add(beach);

    const grassGeo = new THREE.CircleGeometry(12.2, 36);
    const grassMat = new THREE.MeshStandardMaterial({ color: '#2d6a4f', roughness: 0.8 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.02;
    grass.receiveShadow = true;
    dioramaGroup.add(grass);

    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0284c7', // Sky-blue tropical ocean water
      roughness: 0.15,
      metalness: 0.35,
      flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    dioramaGroup.add(ground);

    // --- Procedural Starry Background ---
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 400;
    const starsPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      // Spawn stars on a distant sphere dome
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 120 + Math.random() * 20;
      starsPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starsPositions[i + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // upper dome only
      starsPositions[i + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.35,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    const starfield = new THREE.Points(starsGeo, starsMat);
    scene.add(starfield);
    starfield.visible = false; // Hidden in daytime tropical island view

    // --- VOLCANO GEOMETRIES & MESHES ---
    
    // Function to deform vertices of a cone to make it a rugged volcano with crater
    const createVolcanoGeometry = (thetaLength: number) => {
      // We use cylinder geometry to have open top and open bottom, allowing perfect crater forming
      const geom = new THREE.CylinderGeometry(
        1.8,     // radiusTop (crater rim)
        12,      // radiusBottom (base)
        8,       // height
        36,      // radialSegments
        16,      // heightSegments
        true,    // openEnded
        0,       // thetaStart
        thetaLength // thetaLength (Math.PI * 2 for full, Math.PI for cross section)
      );
      
      // Shift up so base is at y = 0
      geom.translate(0, 4, 0);

      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        const angle = Math.atan2(z, x);
        const horizontalRadius = Math.sqrt(x * x + z * z);

        // Add multi-frequency noise based on angle and height to make it rugged and unique
        const noiseVal = 
          Math.sin(angle * 5) * 0.4 * (1.0 - y / 8.0) + 
          Math.cos(angle * 11) * 0.15 * (1.0 - y / 8.0) +
          Math.sin(y * 1.5) * 0.25;

        // Apply noise outwards radially
        x += Math.cos(angle) * noiseVal;
        z += Math.sin(angle) * noiseVal;

        // Slight terracing/ridge formation on slopes
        if (y < 4 && y > 1) {
          x += Math.cos(angle) * 0.15 * Math.sin(y * 4);
          z += Math.sin(angle) * 0.15 * Math.sin(y * 4);
        }

        pos.setXYZ(i, x, y, z);
      }
      geom.computeVertexNormals();
      return geom;
    };

    // 1. Full Volcano Mesh
    const fullVolcanoGeo = createVolcanoGeometry(Math.PI * 2);
    const volcanoMat = new THREE.MeshStandardMaterial({
      color: '#453f3c', // Grey-brown basalt rock
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true // Gives a nice faceted polygonal low-poly rugged rock feel!
    });
    const mountainFull = new THREE.Mesh(fullVolcanoGeo, volcanoMat);
    mountainFull.castShadow = true;
    mountainFull.receiveShadow = true;
    dioramaGroup.add(mountainFull);
    mountainFullRef.current = mountainFull;

    // 2. Cut Volcano Mesh (180 degrees)
    const cutVolcanoGeo = createVolcanoGeometry(Math.PI);
    // Align so that cut face is on Z = 0 plane (rotate so cut is flat along X-axis)
    const mountainCut = new THREE.Mesh(cutVolcanoGeo, volcanoMat);
    mountainCut.rotation.y = Math.PI; // align cut along X axis facing forward and open to positive Z
    mountainCut.castShadow = true;
    mountainCut.receiveShadow = true;
    dioramaGroup.add(mountainCut);
    mountainCutRef.current = mountainCut;
    mountainCut.visible = false; // Hidden by default

    // 3. Flat Cut Face Plane (Covers the sliced open side at Z = 0)
    const cutFaceGeo = new THREE.PlaneGeometry(24, 8);
    const cutFaceTexture = createGeologicalCutTexture();
    const cutFaceMat = new THREE.MeshStandardMaterial({
      map: cutFaceTexture,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const flatCutFace = new THREE.Mesh(cutFaceGeo, cutFaceMat);
    flatCutFace.position.set(0, 4, 0); // Center matches mountain cut shift
    // Facing forward on Z=0
    dioramaGroup.add(flatCutFace);
    flatCutFaceRef.current = flatCutFace;
    flatCutFace.visible = false; // Hidden by default

    // 4. Magma Chamber (Inner sphere - only visible in CrossSection mode)
    const magmaChamberGeo = new THREE.SphereGeometry(1.5, 24, 24);
    const magmaChamberMat = new THREE.MeshStandardMaterial({
      color: '#ff2200',
      emissive: '#ff1100',
      emissiveIntensity: 1.5,
      roughness: 0.2
    });
    const magmaChamber = new THREE.Mesh(magmaChamberGeo, magmaChamberMat);
    magmaChamber.position.set(0, 1.2, 0); // deep inside
    dioramaGroup.add(magmaChamber);
    magmaChamberRef.current = magmaChamber;
    magmaChamber.visible = false;

    // 5. Central Conduit (Tube linking chamber to crater - visible in crossSection)
    const conduitGeo = new THREE.CylinderGeometry(0.35, 0.45, 6.2, 16);
    const conduitMat = new THREE.MeshStandardMaterial({
      color: '#ff4400',
      emissive: '#ff2200',
      emissiveIntensity: 1.2,
      roughness: 0.3
    });
    const conduit = new THREE.Mesh(conduitGeo, conduitMat);
    conduit.position.set(0, 4.2, 0);
    dioramaGroup.add(conduit);
    conduitRef.current = conduit;
    conduit.visible = false;

    // 6. Lava Crater Lake (glowing cap in crater rim)
    const lavaCraterGeo = new THREE.CylinderGeometry(1.6, 1.4, 0.2, 24);
    const lavaCraterMat = new THREE.MeshStandardMaterial({
      color: '#ff4400',
      emissive: '#ff1100',
      emissiveIntensity: 1.0,
      roughness: 0.5
    });
    const lavaCrater = new THREE.Mesh(lavaCraterGeo, lavaCraterMat);
    lavaCrater.position.set(0, 7.8, 0);
    dioramaGroup.add(lavaCrater);
    lavaCraterRef.current = lavaCrater;

    // --- PARTICLE SYSTEMS SETUP ---
    
    // A. Ash/Smoke Column Particles
    const ashCount = 180;
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    const ashVelocity = new Float32Array(ashCount * 3);
    const ashAge = new Float32Array(ashCount);
    const ashMaxAge = new Float32Array(ashCount);

    // Initial positioning of ash particles inside crater
    for (let i = 0; i < ashCount; i++) {
      ashPos[i * 3] = (Math.random() - 0.5) * 1.5;
      ashPos[i * 3 + 1] = 7.8; // At crater summit
      ashPos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      // Velocities
      ashVelocity[i * 3] = (Math.random() - 0.5) * 0.5; // X drift
      ashVelocity[i * 3 + 1] = 1.0 + Math.random() * 2.5; // Y rise
      ashVelocity[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // Z drift

      ashAge[i] = Math.random() * 5;
      ashMaxAge[i] = 4.0 + Math.random() * 4.0;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPos, 3));
    
    const ashMat = new THREE.PointsMaterial({
      color: '#555555',
      size: 0.8,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      map: createCircleTexture('#777777', 64),
      blending: THREE.NormalBlending
    });
    const ashParticles = new THREE.Points(ashGeo, ashMat);
    dioramaGroup.add(ashParticles);
    ashParticlesRef.current = ashParticles;

    // B. Volcanic Bombs (Glowing flying rocks)
    const bombCount = 60;
    const bombGeo = new THREE.BufferGeometry();
    const bombPos = new Float32Array(bombCount * 3);
    const bombVel = new Float32Array(bombCount * 3);
    const bombAge = new Float32Array(bombCount);
    
    for (let i = 0; i < bombCount; i++) {
      bombPos[i * 3] = 0;
      bombPos[i * 3 + 1] = 7.8;
      bombPos[i * 3 + 2] = 0;

      // High explosive fountain trajectory
      const angle = Math.random() * Math.PI * 2;
      const pitch = Math.PI / 4 + Math.random() * Math.PI / 3; // shoot mostly up
      const speed = 4 + Math.random() * 8;

      bombVel[i * 3] = Math.cos(angle) * Math.sin(pitch) * speed;
      bombVel[i * 3 + 1] = Math.cos(pitch) * speed + 3; // strong upward vector
      bombVel[i * 3 + 2] = Math.sin(angle) * Math.sin(pitch) * speed;

      bombAge[i] = Math.random() * 3; // offset startup
    }
    bombGeo.setAttribute('position', new THREE.BufferAttribute(bombPos, 3));
    const bombMat = new THREE.PointsMaterial({
      color: '#ffbb00',
      size: 0.6,
      transparent: true,
      opacity: 0.95,
      map: createCircleTexture('#ff5500', 32),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const bombParticles = new THREE.Points(bombGeo, bombMat);
    dioramaGroup.add(bombParticles);
    bombParticlesRef.current = bombParticles;

    // C. Lava Flows (flowing down channels)
    // We define 4 channels down the slope
    const lavaPointsCount = 120;
    const lavaGeo = new THREE.BufferGeometry();
    const lavaPos = new Float32Array(lavaPointsCount * 3);
    const lavaChannelIdx = new Uint8Array(lavaPointsCount);
    const lavaProgress = new Float32Array(lavaPointsCount);

    for (let i = 0; i < lavaPointsCount; i++) {
      lavaChannelIdx[i] = Math.floor(Math.random() * 4);
      lavaProgress[i] = Math.random(); // 0 to 1 progress down channel
      
      // Calculate coordinates dynamically later in animation loop
      lavaPos[i * 3] = 0;
      lavaPos[i * 3 + 1] = 0;
      lavaPos[i * 3 + 2] = 0;
    }
    lavaGeo.setAttribute('position', new THREE.BufferAttribute(lavaPos, 3));
    const lavaMat = new THREE.PointsMaterial({
      color: '#ff3700',
      size: 0.5,
      transparent: true,
      opacity: 0.9,
      map: createCircleTexture('#ff2200', 32),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const lavaFlowParticles = new THREE.Points(lavaGeo, lavaMat);
    dioramaGroup.add(lavaFlowParticles);
    lavaFlowParticlesRef.current = lavaFlowParticles;

    // D. Fumaroles (Gentle side steam vents)
    const fCount = 30;
    const fGeo = new THREE.BufferGeometry();
    const fPos = new Float32Array(fCount * 3);
    const fVel = new Float32Array(fCount * 3);
    const fAge = new Float32Array(fCount);

    // Positions on mountain side (eg at a flank vent)
    const ventX = 3.5;
    const ventY = 3.8;
    const ventZ = -1.2;

    for (let i = 0; i < fCount; i++) {
      fPos[i * 3] = ventX + (Math.random() - 0.5) * 0.3;
      fPos[i * 3 + 1] = ventY;
      fPos[i * 3 + 2] = ventZ + (Math.random() - 0.5) * 0.3;

      fVel[i * 3] = 0.2 + Math.random() * 0.4; // drifting right
      fVel[i * 3 + 1] = 0.4 + Math.random() * 0.6; // rising
      fVel[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      fAge[i] = Math.random() * 3;
    }
    fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
    const fMat = new THREE.PointsMaterial({
      color: '#e2f0ff',
      size: 0.4,
      transparent: true,
      opacity: 0.4,
      map: createCircleTexture('#ffffff', 64),
      depthWrite: false
    });
    const fumaroleParticles = new THREE.Points(fGeo, fMat);
    dioramaGroup.add(fumaroleParticles);
    fumaroleParticlesRef.current = fumaroleParticles;

    // E. Magma Chamber Rising Particles (Only visible in cut view)
    const mCount = 40;
    const mGeo = new THREE.BufferGeometry();
    const mPos = new Float32Array(mCount * 3);
    const mAge = new Float32Array(mCount);
    for (let i = 0; i < mCount; i++) {
      mPos[i * 3] = (Math.random() - 0.5) * 0.3;
      mPos[i * 3 + 1] = 1.2 + Math.random() * 6.5; // rising inside conduit
      mPos[i * 3 + 2] = 0.1; // slightly in front of cut face so it doesn't Z-fight
      mAge[i] = Math.random() * 4;
    }
    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    const mMat = new THREE.PointsMaterial({
      color: '#ffff00',
      size: 0.3,
      transparent: true,
      opacity: 0.95,
      map: createCircleTexture('#ffaa00', 32),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const magmaRisingParticles = new THREE.Points(mGeo, mMat);
    dioramaGroup.add(magmaRisingParticles);
    magmaRisingParticlesRef.current = magmaRisingParticles;

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    
    // Pre-calculated paths down slopes for 4 lava channels
    // (x, y, z) path points
    const channels = [
      [ // Channel 1: North West
        { x: 0.5, y: 7.7, z: -1.2 },
        { x: 1.2, y: 6.5, z: -2.4 },
        { x: 2.5, y: 4.5, z: -4.5 },
        { x: 4.5, y: 2.2, z: -7.0 },
        { x: 7.0, y: 0.5, z: -9.5 },
        { x: 9.5, y: 0.05, z: -11.0 }
      ],
      [ // Channel 2: South West
        { x: -0.5, y: 7.7, z: 1.2 },
        { x: -1.5, y: 6.2, z: 2.5 },
        { x: -3.2, y: 4.2, z: 4.6 },
        { x: -5.5, y: 2.0, z: 7.2 },
        { x: -8.0, y: 0.5, z: 9.8 },
        { x: -10.5, y: 0.05, z: 12.0 }
      ],
      [ // Channel 3: North East
        { x: 1.2, y: 7.7, z: 0.5 },
        { x: 2.8, y: 6.0, z: 1.2 },
        { x: 4.8, y: 4.0, z: 2.4 },
        { x: 7.2, y: 1.8, z: 4.2 },
        { x: 9.8, y: 0.4, z: 6.0 },
        { x: 12.0, y: 0.05, z: 7.5 }
      ],
      [ // Channel 4: East South
        { x: -1.2, y: 7.7, z: -0.5 },
        { x: -2.8, y: 5.8, z: -1.5 },
        { x: -4.6, y: 3.8, z: -3.2 },
        { x: -6.8, y: 1.6, z: -5.2 },
        { x: -9.0, y: 0.4, z: -7.2 },
        { x: -11.5, y: 0.05, z: -9.0 }
      ]
    ];

    const lerpChannel = (channelIdx: number, t: number, outVec: THREE.Vector3) => {
      const pts = channels[channelIdx];
      const count = pts.length;
      const scaledT = t * (count - 1);
      const index = Math.floor(scaledT);
      const fraction = scaledT - index;

      if (index >= count - 1) {
        const last = pts[count - 1];
        outVec.set(last.x, last.y, last.z);
        return;
      }

      const p1 = pts[index];
      const p2 = pts[index + 1];

      outVec.set(
        p1.x + (p2.x - p1.x) * fraction,
        p1.y + (p2.y - p1.y) * fraction,
        p1.z + (p2.z - p1.z) * fraction
      );
    };

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Only animate metrics/simulation particles if playing
      const simSpeed = isSimulationPlayingRef.current ? 1.0 : 0.05;

      // Update Controls
      if (controlsRef.current) {
        controlsRef.current.update();
        // Capture current position for helper
        const pos = cameraRef.current?.position;
        if (pos) {
          setCameraPositionInfo({ x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) });
        }
      }

      // --- STAGE-BASED ANIMATION ADJUSTMENTS ---
      let targetGlowIntensity = 0;
      let targetGlowColor = '#000000';
      let ashSpeedYMultiplier = 1.0;
      let ashSpreadMultiplier = 1.0;
      let showFumaroles = true;
      let showLavaCrater = false;
      let showBombs = false;
      let showLavaFlows = false;
      let magmaChamberPulse = 0.5;

      const currentStageVal = currentStageRef.current;

      switch (currentStageVal) {
        case EruptionStage.DORMANT:
          targetGlowIntensity = 0.15;
          targetGlowColor = '#10b981'; // Green bio-fumarole glow / calm
          ashSpeedYMultiplier = 0.15;
          ashSpreadMultiplier = 0.4;
          showFumaroles = true;
          showLavaCrater = false;
          showBombs = false;
          showLavaFlows = false;
          magmaChamberPulse = 0.2;
          break;
        case EruptionStage.PRESSURIZATION:
          targetGlowIntensity = 1.8;
          targetGlowColor = '#ff5500';
          ashSpeedYMultiplier = 0.6;
          ashSpreadMultiplier = 0.8;
          showFumaroles = true;
          showLavaCrater = true;
          showBombs = false;
          showLavaFlows = false;
          magmaChamberPulse = 1.0 + Math.sin(time * 5) * 0.3; // Rapid pulse / high pressure
          break;
        case EruptionStage.EFFUSIVE:
          targetGlowIntensity = 3.5;
          targetGlowColor = '#f97316'; // Orange-red lava flow
          ashSpeedYMultiplier = 0.4;
          ashSpreadMultiplier = 1.2;
          showFumaroles = true;
          showLavaCrater = true;
          showBombs = true; // mild fountains
          showLavaFlows = true;
          magmaChamberPulse = 0.7 + Math.sin(time * 1.5) * 0.1;
          break;
        case EruptionStage.EXPLOSIVE:
          targetGlowIntensity = 8.0;
          targetGlowColor = '#ef4444'; // Hot warning red
          ashSpeedYMultiplier = 3.2; // Massive vertical speed
          ashSpreadMultiplier = 2.8; // Mushroom cloud
          showFumaroles = true;
          showLavaCrater = true;
          showBombs = true; // Extreme volcanic bombs
          showLavaFlows = true; // High velocity lava channels
          magmaChamberPulse = 1.6 + Math.sin(time * 12) * 0.5; // Tremor vibration!
          break;
        case EruptionStage.COLLAPSE:
          targetGlowIntensity = 0.8;
          targetGlowColor = '#06b6d4'; // Cyan steam
          ashSpeedYMultiplier = 0.3;
          ashSpreadMultiplier = 1.5;
          showFumaroles = true;
          showLavaCrater = false;
          showBombs = false;
          showLavaFlows = false;
          magmaChamberPulse = 0.3;
          break;
      }

      // Animate Light Intensity & Color
      if (eruptionPointLightRef.current) {
        eruptionPointLightRef.current.intensity = THREE.MathUtils.lerp(
          eruptionPointLightRef.current.intensity,
          targetGlowIntensity,
          0.05
        );
        eruptionPointLightRef.current.color.lerp(new THREE.Color(targetGlowColor), 0.05);
      }

      // Animate Magma Chamber Glow Pulse
      if (magmaChamberRef.current && magmaChamberRef.current.visible) {
        const mat = magmaChamberRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, magmaChamberPulse * 1.5, 0.1);
        
        // Vibrate camera slightly during explosive tremors
        if (currentStageVal === EruptionStage.EXPLOSIVE && isSimulationPlayingRef.current && cameraRef.current) {
          const shake = 0.04 * Math.sin(time * 40);
          cameraRef.current.position.x += shake * delta * 60;
          cameraRef.current.position.y += shake * delta * 60;
        }
      }

      // 1. ANIMATE ASH/SMOKE COLUMN PARTICLES
      if (ashParticlesRef.current) {
        const positions = ashParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          ashAge[i] += delta * simSpeed;
          
          if (ashAge[i] >= ashMaxAge[i]) {
            // Reset particle inside crater
            ashAge[i] = 0;
            positions[i * 3] = (Math.random() - 0.5) * 1.2;
            positions[i * 3 + 1] = 7.8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
          } else {
            // Particle rising physics
            const ageRatio = ashAge[i] / ashMaxAge[i];
            
            // Speed slows down as it ascends, spreads out to form an umbrella cloud
            const speedY = (1.0 - ageRatio * 0.7) * ashSpeedYMultiplier * 2.0;
            positions[i * 3 + 1] += speedY * delta * 5; // rise up

            // Spread out horizontally (mushroom cloud effect)
            const spreadSpeed = ageRatio * ashSpreadMultiplier * 1.2;
            const angle = (i * 0.1) + time * 0.2;
            positions[i * 3] += Math.cos(angle) * spreadSpeed * delta * 2;
            positions[i * 3 + 2] += Math.sin(angle) * spreadSpeed * delta * 2;
          }
        }
        ashParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Hide/Show or fade ash particles based on stage
        const mat = ashParticlesRef.current.material as THREE.PointsMaterial;
        if (currentStageVal === EruptionStage.DORMANT) {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.1, 0.05);
          mat.size = THREE.MathUtils.lerp(mat.size, 0.3, 0.05);
        } else if (currentStageVal === EruptionStage.EXPLOSIVE) {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.85, 0.05);
          mat.size = THREE.MathUtils.lerp(mat.size, 1.4, 0.05);
          mat.color.set('#3a3532'); // very dark ash
        } else if (currentStageVal === EruptionStage.COLLAPSE) {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.4, 0.05);
          mat.size = THREE.MathUtils.lerp(mat.size, 0.9, 0.05);
          mat.color.set('#5e6973'); // dust grey
        } else {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.5, 0.05);
          mat.size = THREE.MathUtils.lerp(mat.size, 0.7, 0.05);
          mat.color.set('#6b5c57'); // sulfur/steam ash
        }
      }

      // 2. ANIMATE BOMB PARTICLES (Volcanic pyroclastic fountains)
      if (bombParticlesRef.current) {
        const positions = bombParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          bombAge[i] += delta * simSpeed;

          // Parabolic trajectory (y = y0 + v0y*t - 0.5*g*t^2)
          const g = 9.8; // gravity
          
          if (positions[i * 3 + 1] < 0.1 || bombAge[i] > 3.0) {
            // Respawn in crater
            positions[i * 3] = (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 1] = 7.7;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

            const angle = Math.random() * Math.PI * 2;
            const pitch = Math.PI / 6 + Math.random() * Math.PI / 4; // spray outwards
            const speed = showBombs ? (currentStageVal === EruptionStage.EXPLOSIVE ? 8 + Math.random() * 12 : 3 + Math.random() * 5) : 0.01;

            bombVel[i * 3] = Math.cos(angle) * Math.sin(pitch) * speed;
            bombVel[i * 3 + 1] = Math.cos(pitch) * speed + (currentStageVal === EruptionStage.EXPLOSIVE ? 5 : 2); // vertical thrust
            bombVel[i * 3 + 2] = Math.sin(angle) * Math.sin(pitch) * speed;

            bombAge[i] = 0;
          } else {
            // Apply velocities & gravity
            positions[i * 3] += bombVel[i * 3] * delta;
            
            // Gravity pulls bomb down
            bombVel[i * 3 + 1] -= g * delta * (currentStageVal === EruptionStage.EXPLOSIVE ? 1.0 : 0.6);
            positions[i * 3 + 1] += bombVel[i * 3 + 1] * delta;
            
            positions[i * 3 + 2] += bombVel[i * 3 + 2] * delta;
          }
        }
        bombParticlesRef.current.geometry.attributes.position.needsUpdate = true;

        const mat = bombParticlesRef.current.material as THREE.PointsMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, showBombs ? 0.9 : 0.0, 0.05);
      }

      // 3. ANIMATE LAVA FLOW PARTICLES (flowing down channels)
      if (lavaFlowParticlesRef.current) {
        const positions = lavaFlowParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        const outVec = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
          // Flow speed depends on eruption stage
          const flowSpeed = currentStageVal === EruptionStage.EXPLOSIVE ? 0.28 : 0.12;
          
          if (showLavaFlows) {
            lavaProgress[i] += delta * flowSpeed * simSpeed;
            if (lavaProgress[i] > 1.0) {
              lavaProgress[i] = 0.0; // restart at crater top
            }
          } else {
            // slowly recede or stay at 0
            lavaProgress[i] = THREE.MathUtils.lerp(lavaProgress[i], 0, 0.02);
          }

          // Fetch coordinate from channels
          const chIdx = lavaChannelIdx[i];
          lerpChannel(chIdx, lavaProgress[i], outVec);

          // Add minor noise so they don't look like an exact single file line
          const noiseOffset = Math.sin(i * 1.5 + time * 3) * 0.15;
          positions[i * 3] = outVec.x + (chIdx % 2 === 0 ? noiseOffset : 0);
          positions[i * 3 + 1] = outVec.y;
          positions[i * 3 + 2] = outVec.z + (chIdx % 2 !== 0 ? noiseOffset : 0);

          // If in cross section view, split lava flow so it doesn't float in empty space on cut side
          if (crossSectionRef.current) {
            // Cut is facing forward (cut face at Z=0, open to positive Z). We only render lava flowing on Z >= -0.1
            if (positions[i * 3 + 2] < -0.1) {
              positions[i * 3 + 1] = -10.0; // hide below ground!
            }
          }
        }
        lavaFlowParticlesRef.current.geometry.attributes.position.needsUpdate = true;

        const mat = lavaFlowParticlesRef.current.material as THREE.PointsMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, showLavaFlows ? 0.95 : 0.0, 0.05);
      }

      // 4. ANIMATE FUMAROLES
      if (fumaroleParticlesRef.current) {
        const positions = fumaroleParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          fAge[i] += delta * simSpeed;
          if (fAge[i] > 3.0) {
            fAge[i] = 0;
            positions[i * 3] = 3.5 + (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = 3.8;
            positions[i * 3 + 2] = -1.2 + (Math.random() - 0.5) * 0.3;
          } else {
            positions[i * 3] += fVel[i * 3] * delta * 1.2;
            positions[i * 3 + 1] += fVel[i * 3 + 1] * delta * 1.2;
            positions[i * 3 + 2] += fVel[i * 3 + 2] * delta * 1.2;
          }
        }
        fumaroleParticlesRef.current.geometry.attributes.position.needsUpdate = true;

        const mat = fumaroleParticlesRef.current.material as THREE.PointsMaterial;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, showFumaroles ? 0.45 : 0.0, 0.05);
      }

      // 5. ANIMATE MAGMA RISING IN CONDUIT (Only in cross-section view)
      if (magmaRisingParticlesRef.current && magmaRisingParticlesRef.current.visible) {
        const positions = magmaRisingParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          mAge[i] += delta * simSpeed * (currentStageVal === EruptionStage.PRESSURIZATION ? 1.5 : 0.5);
          
          if (mAge[i] > 4.0) {
            mAge[i] = 0;
            positions[i * 3] = (Math.random() - 0.5) * 0.3; // back in magma chamber
            positions[i * 3 + 1] = 1.2; 
          } else {
            // Rise up from 1.2 to 7.8
            positions[i * 3 + 1] = 1.2 + (mAge[i] / 4.0) * 6.5;
            positions[i * 3] = Math.sin(positions[i * 3 + 1] * 3) * 0.15; // wiggle conduit
          }
        }
        magmaRisingParticlesRef.current.geometry.attributes.position.needsUpdate = true;

        const mat = magmaRisingParticlesRef.current.material as THREE.PointsMaterial;
        if (currentStageVal === EruptionStage.DORMANT) {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.1, 0.05);
        } else {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.85, 0.05);
        }
      }

      // Animate Crater Lava Lake Glow
      if (lavaCraterRef.current) {
        const mat = lavaCraterRef.current.material as THREE.MeshStandardMaterial;
        if (showLavaCrater) {
          lavaCraterRef.current.scale.set(1, 1, 1);
          mat.emissiveIntensity = THREE.MathUtils.lerp(
            mat.emissiveIntensity,
            currentStageVal === EruptionStage.EXPLOSIVE ? 3.0 : 1.2,
            0.05
          );
        } else {
          lavaCraterRef.current.scale.set(0.01, 0.01, 0.01); // Shrink lake when dry
        }
      }

      // Warning beacon light animation (Siren)
      if (beaconPointLightRef.current && beaconMatRef.current) {
        if (currentStageVal === EruptionStage.EFFUSIVE || currentStageVal === EruptionStage.EXPLOSIVE) {
          // Rapid flashing warning
          const speed = currentStageVal === EruptionStage.EXPLOSIVE ? 12 : 6;
          const flash = Math.sin(time * speed) > 0;
          beaconPointLightRef.current.intensity = flash ? 3.0 : 0.1;
          beaconMatRef.current.emissiveIntensity = flash ? 2.5 : 0.2;
          beaconPointLightRef.current.color.set('#ef4444');
          beaconMatRef.current.color.set('#ef4444');
          beaconMatRef.current.emissive.set('#ef4444');
        } else if (currentStageVal === EruptionStage.PRESSURIZATION) {
          // Pulsing warning
          const pulse = (Math.sin(time * 3) + 1.0) / 2.0;
          beaconPointLightRef.current.color.set('#f59e0b');
          beaconMatRef.current.color.set('#f59e0b');
          beaconMatRef.current.emissive.set('#f59e0b');
          beaconPointLightRef.current.intensity = pulse * 1.5;
          beaconMatRef.current.emissiveIntensity = pulse * 1.2 + 0.1;
        } else {
          // Off or quiet green glow
          beaconPointLightRef.current.intensity = 0;
          beaconMatRef.current.color.set('#ef4444');
          beaconMatRef.current.emissive.set('#ef4444');
          beaconMatRef.current.emissiveIntensity = 0.1;
        }
      }

      // Live Telemetry Canvas Drawing
      if (leftCtx && rightCtx) {
        const m = metricsRef.current;

        // --- DRAW LEFT TERMINAL (Seismology & Seismograph) ---
        leftCtx.fillStyle = '#0f172a'; // dark slate bg
        leftCtx.fillRect(0, 0, 512, 384);

        // Grid lines
        leftCtx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
        leftCtx.lineWidth = 1;
        for (let x = 0; x < 512; x += 40) {
          leftCtx.beginPath(); leftCtx.moveTo(x, 0); leftCtx.lineTo(x, 384); leftCtx.stroke();
        }
        for (let y = 0; y < 384; y += 40) {
          leftCtx.beginPath(); leftCtx.moveTo(0, y); leftCtx.lineTo(512, y); leftCtx.stroke();
        }

        // Header
        leftCtx.fillStyle = '#38bdf8'; // light blue
        leftCtx.font = 'bold 24px monospace';
        leftCtx.fillText('TERMSIS-01: SEISMIC & PRESSURE', 20, 40);

        // Stage status box
        let stageColor = '#10b981';
        let stageName = 'DORMANT (ESTABLE)';
        if (currentStageVal === EruptionStage.PRESSURIZATION) { stageColor = '#f59e0b'; stageName = 'TREMOR (ALTA PRESIÓN)'; }
        else if (currentStageVal === EruptionStage.EFFUSIVE) { stageColor = '#f97316'; stageName = 'EFFUSIVE ERUPTION'; }
        else if (currentStageVal === EruptionStage.EXPLOSIVE) { stageColor = '#ef4444'; stageName = 'CRITICAL EXPLOSION'; }
        else if (currentStageVal === EruptionStage.COLLAPSE) { stageColor = '#06b6d4'; stageName = 'CALDERA COLLAPSE'; }

        leftCtx.fillStyle = stageColor + '22'; // alpha bg
        leftCtx.fillRect(20, 60, 472, 40);
        leftCtx.strokeStyle = stageColor;
        leftCtx.lineWidth = 2;
        leftCtx.strokeRect(20, 60, 472, 40);
        
        leftCtx.fillStyle = stageColor;
        leftCtx.font = 'bold 18px monospace';
        leftCtx.fillText(`VOLCANO STATE: ${stageName}`, 35, 86);

        // Numeric fields (Seismicity & Pressure)
        leftCtx.fillStyle = '#f8fafc';
        leftCtx.font = 'bold 18px monospace';
        leftCtx.fillText('SISMICIDAD:', 20, 140);
        leftCtx.fillStyle = stageColor;
        leftCtx.font = 'bold 32px monospace';
        leftCtx.fillText(`${m.seismicity.toFixed(1)} Hz`, 180, 143);

        leftCtx.fillStyle = '#f8fafc';
        leftCtx.font = 'bold 18px monospace';
        leftCtx.fillText('PRESIÓN MAGMA:', 20, 190);
        leftCtx.fillStyle = stageColor;
        leftCtx.font = 'bold 32px monospace';
        leftCtx.fillText(`${m.magmaPressure.toFixed(2)} GPa`, 180, 193);

        // Animated Seismograph display
        leftCtx.strokeStyle = stageColor;
        leftCtx.lineWidth = 2;
        leftCtx.beginPath();
        leftCtx.moveTo(20, 290);
        const amplitude = m.seismicity * 6;
        const frequency = 0.05 + m.seismicity * 0.03;
        for (let i = 20; i < 492; i++) {
          const sineNoise = Math.sin(i * frequency - time * 15) * amplitude;
          const randomTremor = (currentStageVal === EruptionStage.EXPLOSIVE) ? (Math.random() - 0.5) * 20 : 0;
          leftCtx.lineTo(i, 290 + sineNoise + randomTremor);
        }
        leftCtx.stroke();

        // Seismograph box outline
        leftCtx.strokeStyle = 'rgba(248, 250, 252, 0.2)';
        leftCtx.strokeRect(20, 230, 472, 120);

        leftCtx.fillStyle = 'rgba(248, 250, 252, 0.4)';
        leftCtx.font = '12px monospace';
        leftCtx.fillText('REGISTRO SISMOGRÁFICO EN TIEMPO REAL (UTC)', 30, 248);

        leftTexture.needsUpdate = true;


        // --- DRAW RIGHT TERMINAL (Thermal & Gas) ---
        rightCtx.fillStyle = '#0f172a';
        rightCtx.fillRect(0, 0, 512, 384);

        // Grid lines
        rightCtx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
        rightCtx.lineWidth = 1;
        for (let x = 0; x < 512; x += 40) {
          rightCtx.beginPath(); rightCtx.moveTo(x, 0); rightCtx.lineTo(x, 384); rightCtx.stroke();
        }
        for (let y = 0; y < 384; y += 40) {
          rightCtx.beginPath(); rightCtx.moveTo(0, y); rightCtx.lineTo(512, y); rightCtx.stroke();
        }

        // Header
        rightCtx.fillStyle = '#38bdf8';
        rightCtx.font = 'bold 24px monospace';
        rightCtx.fillText('CHEMANAL-02: EMISSIONS & THERMAL', 20, 40);

        // Temperature
        rightCtx.fillStyle = '#f8fafc';
        rightCtx.font = 'bold 18px monospace';
        rightCtx.fillText('TEMP. CRÁTER:', 20, 90);
        rightCtx.fillStyle = '#f43f5e'; // red-pink
        rightCtx.font = 'bold 32px monospace';
        rightCtx.fillText(`${m.craterTemp.toFixed(1)} °C`, 180, 93);

        // Gas SO2
        rightCtx.fillStyle = '#f8fafc';
        rightCtx.font = 'bold 18px monospace';
        rightCtx.fillText('EMISIÓN SO2:', 20, 140);
        rightCtx.fillStyle = '#a855f7'; // purple
        rightCtx.font = 'bold 32px monospace';
        rightCtx.fillText(`${m.gasSO2.toFixed(1)} t/d`, 180, 143);

        // Ground Tilt
        rightCtx.fillStyle = '#f8fafc';
        rightCtx.font = 'bold 18px monospace';
        rightCtx.fillText('DEFORMACIÓN:', 20, 190);
        rightCtx.fillStyle = '#10b981'; // green
        rightCtx.font = 'bold 32px monospace';
        rightCtx.fillText(`${m.groundTilt.toFixed(3)} urad`, 180, 193);

        // Visual graph for temperature filling up
        rightCtx.fillStyle = '#1e293b';
        rightCtx.fillRect(20, 250, 472, 35);
        rightCtx.strokeStyle = 'rgba(248, 250, 252, 0.2)';
        rightCtx.strokeRect(20, 250, 472, 35);

        // Filled temperature bar
        const maxTemp = 1200; // max possible temperature
        const fillWidth = Math.min(472, (m.craterTemp / maxTemp) * 472);
        const barGrad = rightCtx.createLinearGradient(20, 0, 492, 0);
        barGrad.addColorStop(0, '#f59e0b');
        barGrad.addColorStop(0.5, '#f97316');
        barGrad.addColorStop(1, '#f43f5e');
        rightCtx.fillStyle = barGrad;
        rightCtx.fillRect(21, 251, fillWidth, 33);

        rightCtx.fillStyle = '#f8fafc';
        rightCtx.font = 'bold 12px monospace';
        rightCtx.fillText(`INDICADOR TÉRMICO MÁXIMO (1200°C) - ACTUAL: ${m.craterTemp.toFixed(1)}°C`, 30, 305);

        // Bottom scientific text telemetry ticker
        rightCtx.fillStyle = 'rgba(248, 250, 252, 0.4)';
        rightCtx.font = '12px monospace';
        rightCtx.fillText(`TIEMPO TRANSCURRIDO DE MEDICIÓN: ${m.currentTime}`, 20, 350);

        rightTexture.needsUpdate = true;
      }

      // Orbit diorama slowly if simulation is playing, user is not dragging, and NOT in WebXR
      if (isSimulationPlayingRef.current && controlsRef.current && (controlsRef.current.state === -1) && !renderer.xr.isPresenting) {
        dioramaGroup.rotation.y = time * 0.03;
      }

      // WebXR Controller Locomotion, Button States, and Haptic Feedback Checks
      if (renderer.xr.isPresenting && cameraGroupRef.current) {
        // Slowly return pressed plungers to their normal positions (spring restitution effect)
        interactiveButtons.forEach((btn) => {
          if (btn.position.y < btn.userData.originalY) {
            btn.position.y = THREE.MathUtils.lerp(btn.position.y, btn.userData.originalY, 0.1);
            if (Math.abs(btn.position.y - btn.userData.originalY) < 0.001) {
              btn.position.y = btn.userData.originalY;
              const mat = btn.material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity = 0.4; // restore glow intensity
            }
          }
        });

        // Joystick-based VR locomotion & rotation
        const session = renderer.xr.getSession();
        if (session) {
          for (const source of session.inputSources) {
            if (source.gamepad) {
              const axes = source.gamepad.axes;
              
              // Left Controller: Translate/locomotion
              if (source.handedness === 'left') {
                const thumbX = axes.length > 2 ? axes[2] : axes[0];
                const thumbY = axes.length > 2 ? axes[3] : axes[1];
                
                if (Math.abs(thumbX) > 0.15 || Math.abs(thumbY) > 0.15) {
                  const direction = new THREE.Vector3();
                  camera.getWorldDirection(direction);
                  direction.y = 0; // lock movement to horizontal sea level plane
                  direction.normalize();

                  const sideDirection = new THREE.Vector3();
                  sideDirection.copy(direction).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

                  const moveSpeed = 6.0 * delta; // 6 meters per second
                  cameraGroupRef.current.position.addScaledVector(direction, -thumbY * moveSpeed);
                  cameraGroupRef.current.position.addScaledVector(sideDirection, thumbX * moveSpeed);
                }
              }
              
              // Right Controller: Snap/continuous rotation and vertical fly
              if (source.handedness === 'right') {
                const thumbX = axes.length > 2 ? axes[2] : axes[0];
                const thumbY = axes.length > 2 ? axes[3] : axes[1];
                
                if (Math.abs(thumbX) > 0.15) {
                  const turnSpeed = 2.0 * delta; // 2 radians per second
                  cameraGroupRef.current.rotation.y -= thumbX * turnSpeed;
                }
                if (Math.abs(thumbY) > 0.15) {
                  const flySpeed = 5.0 * delta;
                  cameraGroupRef.current.position.y -= thumbY * flySpeed;
                }
              }
            }
          }
        }

        // Limit user altitude so they don't drown or go to outer space
        if (cameraGroupRef.current.position.y < 0) {
          cameraGroupRef.current.position.y = 0;
        }
        if (cameraGroupRef.current.position.y > 25) {
          cameraGroupRef.current.position.y = 25;
        }
      }

      renderer.render(scene, camera);
    };

    // --- Start/Stop rendering with standard loop (handles WebXR rendering internally too) ---
    renderer.setAnimationLoop(animate);

    // --- Cleanup ---
    return () => {
      renderer.setAnimationLoop(null);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
        const btn = document.getElementById('webxr-vr-button');
        if (btn && containerRef.current.contains(btn)) {
          containerRef.current.removeChild(btn);
        }
      }
      
      // Remove controller event listeners to prevent memory leaks
      controller1.removeEventListener('selectstart', onSelectStart);
      controller2.removeEventListener('selectstart', onSelectStart);

      // dispose textures
      leftTexture.dispose();
      rightTexture.dispose();

      // dispose geometries/materials
      fullVolcanoGeo.dispose();
      cutVolcanoGeo.dispose();
      cutFaceGeo.dispose();
      magmaChamberGeo.dispose();
      conduitGeo.dispose();
      lavaCraterGeo.dispose();
      starsGeo.dispose();
      ashGeo.dispose();
      bombGeo.dispose();
      lavaGeo.dispose();
      fGeo.dispose();
      mGeo.dispose();

      // dispose new WebXR & tropical scene geometries and materials
      beachGeo.dispose();
      beachMat.dispose();
      grassGeo.dispose();
      grassMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      pillarGeo.dispose();
      pillarMat.dispose();
      deskGeo.dispose();
      deskMat.dispose();
      boardGeo.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      plungerGeo.dispose();
      deckFloorGeo.dispose();
      deckFloorMat.dispose();
    };
  }, []); // Re-init on simulation state changes to bind clock & speed

  // Listen to crossSection toggles or Stage Changes to show/hide corresponding meshes
  useEffect(() => {
    if (!sceneRef.current) return;

    const showCut = crossSection;
    
    // Toggle meshes
    if (mountainFullRef.current) mountainFullRef.current.visible = !showCut;
    if (mountainCutRef.current) mountainCutRef.current.visible = showCut;
    if (flatCutFaceRef.current) flatCutFaceRef.current.visible = showCut;
    if (magmaChamberRef.current) magmaChamberRef.current.visible = showCut;
    if (conduitRef.current) conduitRef.current.visible = showCut;
    if (magmaRisingParticlesRef.current) magmaRisingParticlesRef.current.visible = showCut;

  }, [crossSection]);

  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0, 12, 22);
      controlsRef.current.target.set(0, 3, 0);
      controlsRef.current.update();
    }
  };

  const zoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, 3);
      controlsRef.current.update();
    }
  };

  const zoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(dir);
      cameraRef.current.position.addScaledVector(dir, -3);
      controlsRef.current.update();
    }
  };

  const toggleLabels = () => {
    setShowHelperLabels(!showHelperLabels);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden" id="simulation-viewport">
      {/* 3D Render Canvas Container */}
      <div ref={containerRef} className="w-full flex-grow relative" style={{ minHeight: '300px' }} />

      {/* Floating 3D Navigation Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-2.5 rounded-xl shadow-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1 border-b border-slate-800 pb-1.5">
            <Compass className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-[10px] font-mono font-semibold text-slate-300 uppercase tracking-wider">Cámara 3D</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={zoomIn}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
              title="Acercar Cámara"
              id="btn-zoom-in"
            >
              <ZoomIn className="w-4 h-4 text-emerald-400" />
              <span>Zoom +</span>
            </button>
            <button
              onClick={zoomOut}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
              title="Alejar Cámara"
              id="btn-zoom-out"
            >
              <ZoomOut className="w-4 h-4 text-emerald-400" />
              <span>Zoom -</span>
            </button>
          </div>

          <button
            onClick={handleResetCamera}
            className="w-full p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium"
            id="btn-reset-cam"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Vista</span>
          </button>

          <button
            onClick={() => setCrossSection(!crossSection)}
            className={`w-full p-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-medium border ${
              crossSection
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-transparent'
            }`}
            id="btn-toggle-cross-section"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{crossSection ? 'Vista Externa' : 'Corte Transversal'}</span>
          </button>
        </div>

        {/* Quest 3 Status Overlay Indicator */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 px-3 py-2 rounded-xl flex items-center gap-2 shadow-xl">
          <div className={`w-2.5 h-2.5 rounded-full ${isVrActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-[11px] font-mono font-medium text-slate-200">
            {isVrActive ? 'MODO INMERSIVO VR ACTIVO' : 'SOPORTE VR DISPONIBLE (QUEST 3)'}
          </span>
        </div>
      </div>

      {/* Camera Coordinates Overlay (Scientific Detail) */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none hidden sm:flex flex-col gap-1 items-end">
        <div className="bg-slate-900/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800/60 font-mono text-[9px] text-slate-400 shadow-lg">
          <div className="text-slate-500 uppercase tracking-widest text-[8px] mb-0.5">Sonda de Observación</div>
          <div>COORD X: <span className="text-rose-400">{cameraPositionInfo.x}m</span></div>
          <div>COORD Y: <span className="text-rose-400">{cameraPositionInfo.y}m</span></div>
          <div>COORD Z: <span className="text-rose-400">{cameraPositionInfo.z}m</span></div>
        </div>
      </div>

      {/* Legend & 3D Interactive labels on corte transversal */}
      {crossSection && (
        <div className="absolute bottom-16 right-4 z-10 max-w-xs bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl">
          <h4 className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
            Geología Interna
          </h4>
          <div className="flex flex-col gap-1.5 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
              <span><strong>Cámara Magmática:</strong> Cámara interna de acumulación.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span><strong>Conducto Central:</strong> Chimenea de salida principal.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span><strong>Cráter:</strong> Boca eruptiva activa.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span><strong>Estratos:</strong> Capas alternas de lava y ceniza.</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating alert for explosive stage */}
      {currentStage === EruptionStage.EXPLOSIVE && isSimulationPlaying && (
        <div className="absolute inset-x-4 top-1/3 z-10 pointer-events-none flex justify-center animate-bounce">
          <div className="bg-red-500/20 backdrop-blur-md border border-red-500 text-red-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
            <AlertTriangle className="w-6 h-6 text-red-500 animate-ping flex-shrink-0" />
            <div className="text-left">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">¡Alerta Sísmica Máxima!</div>
              <div className="text-[10px] leading-relaxed font-mono mt-0.5">Se registra Tremor Espasmódico. Columnas piroclásticas superando 12,000m. Riesgo extremo.</div>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Playback Bar at the bottom of the canvas */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setIsSimulationPlaying(!isSimulationPlaying)}
          className={`p-2.5 rounded-xl shadow-lg border backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold font-mono ${
            isSimulationPlaying
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
          id="btn-toggle-playback"
        >
          {isSimulationPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSAR SIMULACIÓN</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>REANUDAR SIMULACIÓN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
