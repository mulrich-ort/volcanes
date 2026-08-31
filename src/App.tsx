/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { EruptionStage, ERUPTION_STAGES, LiveMetrics } from './types';
import VolcanoSimulation from './components/VolcanoSimulation';
import ScientificDashboard from './components/ScientificDashboard';
import EducationalGuide from './components/EducationalGuide';
import QuestSimulator from './components/QuestSimulator';
import { 
  Flame, 
  Activity, 
  BookOpen, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Layers, 
  Eye, 
  Menu, 
  Info, 
  ShieldAlert,
  AlertOctagon,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function App() {
  const [currentStage, setCurrentStage] = useState<EruptionStage>(EruptionStage.DORMANT);
  const [crossSection, setCrossSection] = useState<boolean>(false);
  const [isSimulationPlaying, setIsSimulationPlaying] = useState<boolean>(true);
  const [isVrActive, setIsVrActive] = useState<boolean>(false);

  // Quest 3 Mocking states
  const [isStereoMode, setIsStereoMode] = useState<boolean>(false);
  const [isPassthrough, setIsPassthrough] = useState<boolean>(false);

  // Active Tab in the Control Center panel
  const [activeTab, setActiveTab] = useState<'telemetry' | 'study' | 'meta-quest'>('telemetry');

  // Live scientific metrics
  const [metrics, setMetrics] = useState<LiveMetrics>({
    seismicity: 4,
    magmaPressure: 5.1,
    craterTemp: 32,
    gasSO2: 11,
    groundTilt: 0.1,
    currentTime: '--:--:--'
  });

  // Audio nodes for Web Audio volcano rumble and alarm simulation
  const audioContextRef = useRef<AudioContext | null>(null);
  const rumbleOscRef = useRef<OscillatorNode | null>(null);
  const alarmOscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Live telemetry generator
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSimulationPlaying) {
      interval = setInterval(() => {
        const range = ERUPTION_STAGES[currentStage].metricsRange;
        
        const randVal = (min: number, max: number) => {
          return min + Math.random() * (max - min);
        };

        setMetrics({
          seismicity: randVal(range.seismicity.min, range.seismicity.max),
          magmaPressure: randVal(range.magmaPressure.min, range.magmaPressure.max),
          craterTemp: randVal(range.craterTemp.min, range.craterTemp.max),
          gasSO2: randVal(range.gasSO2.min, range.gasSO2.max),
          groundTilt: randVal(range.groundTilt.min, range.groundTilt.max),
          currentTime: new Date().toLocaleTimeString('es-ES', { hour12: false })
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [currentStage, isSimulationPlaying]);

  // Audio generator (Rumble & Siren alarms)
  useEffect(() => {
    if (isMuted) {
      stopAudio();
    } else {
      startAudio();
    }
    return () => stopAudio();
  }, [isMuted, currentStage, isSimulationPlaying]);

  const startAudio = () => {
    try {
      // Initialize Audio Context lazily
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop existing nodes before creating new ones
      stopAudioNodes();

      // Create main output volume gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.12, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // 1. Earth Rumble synthesis (Low frequency triangle wave)
      const rumble = ctx.createOscillator();
      rumble.type = 'triangle';
      
      let baseFreq = 42;
      if (currentStage === EruptionStage.PRESSURIZATION) baseFreq = 55;
      if (currentStage === EruptionStage.EFFUSIVE) baseFreq = 62;
      if (currentStage === EruptionStage.EXPLOSIVE) baseFreq = 78;
      if (currentStage === EruptionStage.COLLAPSE) baseFreq = 48;

      rumble.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      
      // Pitch modulation to simulate seismic waves shifting
      const modulation = ctx.createOscillator();
      modulation.type = 'sine';
      modulation.frequency.setValueAtTime(0.8, ctx.currentTime); // 0.8 Hz oscillation
      
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(12, ctx.currentTime); // pitch deviation in Hz

      modulation.connect(modGain);
      modGain.connect(rumble.frequency);
      
      rumble.connect(masterGain);
      
      rumble.start();
      modulation.start();
      
      rumbleOscRef.current = rumble;

      // 2. Alarm siren (when explosive and active)
      if (currentStage === EruptionStage.EXPLOSIVE && isSimulationPlaying) {
        const siren = ctx.createOscillator();
        siren.type = 'sawtooth';
        siren.frequency.setValueAtTime(440, ctx.currentTime);

        const sirenMod = ctx.createOscillator();
        sirenMod.type = 'sine';
        sirenMod.frequency.setValueAtTime(1.5, ctx.currentTime); // 1.5Hz sweep

        const sirenModGain = ctx.createGain();
        sirenModGain.gain.setValueAtTime(150, ctx.currentTime);

        sirenMod.connect(sirenModGain);
        sirenModGain.connect(siren.frequency);

        // Separate volume for siren so it's not overly piercing
        const sirenGain = ctx.createGain();
        sirenGain.gain.setValueAtTime(0.04, ctx.currentTime);

        siren.connect(sirenGain);
        sirenGain.connect(ctx.destination);

        siren.start();
        sirenMod.start();

        alarmOscRef.current = siren;
      }
    } catch (e) {
      console.warn("Audio Context failed to start:", e);
    }
  };

  const stopAudioNodes = () => {
    if (rumbleOscRef.current) {
      try { rumbleOscRef.current.stop(); } catch(e){}
      rumbleOscRef.current = null;
    }
    if (alarmOscRef.current) {
      try { alarmOscRef.current.stop(); } catch(e){}
      alarmOscRef.current = null;
    }
  };

  const stopAudio = () => {
    stopAudioNodes();
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* GLOBAL HEAD NAVIGATION BAR */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center border border-rose-500/30 shadow-lg">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-mono font-black tracking-wider text-slate-100 uppercase">Simulador Volcánico Inmersivo</h1>
              <span className="text-[9px] font-mono font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                META QUEST 3 / VR WEBXR
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">Observatorio Virtual y Aula Interactiva para Estudiantes de Vulcanología</p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-4">
          
          {/* Audio Synthesizer Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-mono font-bold ${
              isMuted 
                ? 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700' 
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 shadow-md'
            }`}
            title={isMuted ? "Activar Sonido del Volcán" : "Silenciar Sonido"}
            id="btn-toggle-audio"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden md:inline">SONIDO DESACTIVADO</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span className="hidden md:inline">SONIDO SISMOLÓGICO</span>
              </>
            )}
          </button>

          {/* Clock Feed */}
          <div className="hidden lg:flex flex-col text-right font-mono text-[10px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-500 text-[8px] uppercase tracking-widest font-bold">Reloj Sismográfico</span>
            <span>{metrics.currentTime !== '--:--:--' ? metrics.currentTime : 'SINCRONIZANDO...'}</span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT COLUMN: ERUPTION STAGES CONTROLLER */}
        <section className="w-full lg:w-[320px] xl:w-[350px] bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 z-10 overflow-y-auto max-h-64 lg:max-h-none">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-rose-500" />
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Disparadores de Erupción</h2>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <p className="text-[11px] font-sans text-slate-400 leading-normal mb-1">
              Haz clic en cualquier etapa de la erupción para desencadenar el proceso sismológico y magmático en tiempo real:
            </p>

            {Object.values(ERUPTION_STAGES).map((stage) => {
              const isActive = currentStage === stage.id;
              
              return (
                <button
                  key={stage.id}
                  onClick={() => setCurrentStage(stage.id)}
                  className={`group w-full p-3.5 rounded-xl text-left border transition-all duration-300 relative overflow-hidden flex flex-col gap-1.5 ${
                    isActive
                      ? 'bg-slate-950 border-rose-500/70 text-slate-100 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                  id={`btn-stage-${stage.id.toLowerCase()}`}
                >
                  {/* Subtle color highlight edge */}
                  <span className={`absolute left-0 inset-y-0 w-1 transition-all ${
                    isActive ? 'bg-rose-500' : 'bg-slate-800 group-hover:bg-slate-700'
                  }`} />

                  <div className="flex items-center justify-between pl-1">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">{stage.name}</span>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${
                      isActive ? stage.color : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}>
                      {isActive ? 'ACTIVO' : 'EN COLA'}
                    </span>
                  </div>

                  <span className="text-[11px] leading-relaxed pl-1 text-slate-400 group-hover:text-slate-300 font-sans truncate-2-lines">
                    {stage.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* CENTER COLUMN: immersive 3D/VR Viewport */}
        <section className="flex-grow bg-slate-950 flex flex-col relative h-[450px] lg:h-auto overflow-hidden">
          
          {/* STEREO GOGGLES VR PREVIEW MASK LAYER */}
          {isStereoMode && (
            <div className="absolute inset-0 z-10 pointer-events-none flex">
              {/* Left Eye Mask Overlay */}
              <div className="w-1/2 h-full bg-black/40 border-r-4 border-black relative flex items-center justify-center">
                <div className="absolute w-[280px] h-[280px] rounded-full border-[16px] border-black shadow-[inset_0_0_80px_rgba(0,0,0,0.95)]" />
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-slate-500 uppercase font-bold bg-black/70 px-2.5 py-1 rounded">
                  Lente Izquierdo VR
                </span>
              </div>
              
              {/* Right Eye Mask Overlay */}
              <div className="w-1/2 h-full bg-black/40 border-l-4 border-black relative flex items-center justify-center">
                <div className="absolute w-[280px] h-[280px] rounded-full border-[16px] border-black shadow-[inset_0_0_80px_rgba(0,0,0,0.95)]" />
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-slate-500 uppercase font-bold bg-black/70 px-2.5 py-1 rounded">
                  Lente Derecho VR
                </span>
              </div>
            </div>
          )}

          {/* PASSTHROUGH (MIXED REALITY) GRID MOCK GRID SLIDER BACKGROUND */}
          {isPassthrough && (
            <div className="absolute inset-0 pointer-events-none border-[12px] border-indigo-500/20 z-10" />
          )}

          {/* Actual 3D Simulation WebGL Viewport */}
          <div className="w-full h-full relative">
            <VolcanoSimulation
              currentStage={currentStage}
              setCurrentStage={setCurrentStage}
              crossSection={crossSection}
              setCrossSection={setCrossSection}
              metrics={metrics}
              isSimulationPlaying={isSimulationPlaying}
              setIsSimulationPlaying={setIsSimulationPlaying}
              isVrActive={isVrActive}
              setIsVrActive={setIsVrActive}
            />
          </div>

          {/* Quick interactive top status bar overlay */}
          <div className="absolute top-4 right-4 lg:right-20 z-10 pointer-events-none bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3.5 shadow-2xl">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Estado Erupción</span>
              <span className="text-xs font-mono font-bold text-rose-400">{ERUPTION_STAGES[currentStage].name}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Sismicidad</span>
              <span className="text-xs font-mono font-bold text-amber-400">{metrics.seismicity.toFixed(0)} S/H</span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: TABBED SCIENTIFIC CONTROL ROOM */}
        <section className="w-full lg:w-[380px] xl:w-[410px] bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0 z-10 overflow-hidden">
          
          {/* TAB CONTROLLERS */}
          <div className="flex bg-slate-950 p-2.5 border-b border-slate-800 gap-1.5">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex-grow py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTab === 'telemetry'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-transparent'
              }`}
              id="tab-telemetry"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Telemetría</span>
            </button>

            <button
              onClick={() => setActiveTab('study')}
              className={`flex-grow py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTab === 'study'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-transparent'
              }`}
              id="tab-study"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guía y Test</span>
            </button>

            <button
              onClick={() => setActiveTab('meta-quest')}
              className={`flex-grow py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 border ${
                activeTab === 'meta-quest'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-transparent'
              }`}
              id="tab-meta-quest"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quest 3 VR</span>
            </button>
          </div>

          {/* TAB PANELS CONTAINER */}
          <div className="p-4 flex-grow overflow-y-auto">
            {activeTab === 'telemetry' && (
              <ScientificDashboard
                currentStage={currentStage}
                metrics={metrics}
                isSimulationPlaying={isSimulationPlaying}
              />
            )}

            {activeTab === 'study' && (
              <EducationalGuide
                currentStage={currentStage}
              />
            )}

            {activeTab === 'meta-quest' && (
              <QuestSimulator
                currentStageName={ERUPTION_STAGES[currentStage].name}
                crossSection={crossSection}
                setCrossSection={setCrossSection}
                isStereoMode={isStereoMode}
                setIsStereoMode={setIsStereoMode}
                isPassthrough={isPassthrough}
                setIsPassthrough={setIsPassthrough}
              />
            )}
          </div>
        </section>

      </main>

      {/* FOOTER METRIC STATUS AND COMPLIANCE BAR */}
      <footer className="flex-shrink-0 bg-slate-950 border-t border-slate-900 px-6 py-2.5 flex items-center justify-between text-[9px] font-mono text-slate-500 z-20">
        <div>MODO DE RENDER: WEBGL 2.0 / THREE.JS STABLE</div>
        <div className="flex items-center gap-4">
          <span>ALERTA DE SISTEMA: SENSOR LOG ACTIVO</span>
          <span className="text-slate-800">|</span>
          <span>ESTADO: CALIBRADO</span>
        </div>
      </footer>
      
    </div>
  );
}
