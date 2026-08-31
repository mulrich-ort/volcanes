import React, { useState, useEffect, useRef } from 'react';
import { EruptionStage, ERUPTION_STAGES, LiveMetrics } from '../types';
import { Activity, Thermometer, Gauge, Wind, Mountain, RefreshCw, Radio, Bell } from 'lucide-react';

interface ScientificDashboardProps {
  currentStage: EruptionStage;
  metrics: LiveMetrics;
  isSimulationPlaying: boolean;
}

export default function ScientificDashboard({
  currentStage,
  metrics,
  isSimulationPlaying
}: ScientificDashboardProps) {
  const stageInfo = ERUPTION_STAGES[currentStage];
  
  // Real-time seismograph historical data
  const [seismicHistory, setSeismicHistory] = useState<number[]>(Array(50).fill(10));
  const [alerts, setAlerts] = useState<{ id: string; time: string; msg: string; type: 'info' | 'warning' | 'danger' }[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate scrolling seismograph
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSimulationPlaying) {
      interval = setInterval(() => {
        setSeismicHistory((prev) => {
          const next = [...prev.slice(1)];
          
          // Generate realistic seismic wave spikes based on the selected stage
          let baseValue = 10;
          let noiseAmp = 5;
          let randomSpikes = 0.05; // probability of sudden earthquake fracture spike

          switch (currentStage) {
            case EruptionStage.DORMANT:
              baseValue = 5;
              noiseAmp = 3;
              randomSpikes = 0.02;
              break;
            case EruptionStage.PRESSURIZATION:
              baseValue = 35;
              noiseAmp = 15;
              randomSpikes = 0.15; // frequent tectonic cracks
              break;
            case EruptionStage.EFFUSIVE:
              // Steady tremor (harmonic tremor) is very oscillatory and continuous
              baseValue = 30 + Math.sin(Date.now() * 0.05) * 12;
              noiseAmp = 6;
              randomSpikes = 0.02;
              break;
            case EruptionStage.EXPLOSIVE:
              // Violent tremor and continuous blast spikes
              baseValue = 90 + Math.sin(Date.now() * 0.1) * 35;
              noiseAmp = 25;
              randomSpikes = 0.45;
              break;
            case EruptionStage.COLLAPSE:
              // Low frequency settling events
              baseValue = 15 + Math.cos(Date.now() * 0.02) * 5;
              noiseAmp = 8;
              randomSpikes = 0.1;
              break;
          }

          let val = baseValue + (Math.random() - 0.5) * noiseAmp * 2;
          
          // Add massive spike if lucky
          if (Math.random() < randomSpikes) {
            val += (Math.random() * 45 + 15) * (currentStage === EruptionStage.EXPLOSIVE ? 1.5 : 1.0);
          }

          // Cap
          val = Math.max(2, Math.min(val, 195));
          next.push(val);
          return next;
        });
      }, 120);
    }

    return () => clearInterval(interval);
  }, [currentStage, isSimulationPlaying]);

  // Log automated system warnings on stage transitions
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour12: false });
    let newAlert: { id: string; time: string; msg: string; type: 'info' | 'warning' | 'danger' };

    switch (currentStage) {
      case EruptionStage.DORMANT:
        newAlert = {
          id: Math.random().toString(),
          time: timeStr,
          msg: "SISTEMA ESTABLE: Sismicidad de fondo dentro de los parámetros habituales (Línea Base).",
          type: 'info'
        };
        break;
      case EruptionStage.PRESSURIZATION:
        newAlert = {
          id: Math.random().toString(),
          time: timeStr,
          msg: "¡ALERTA AMARILLA!: Enjambre de sismos de fractura de roca profunda detectado. Presurización en curso.",
          type: 'warning'
        };
        break;
      case EruptionStage.EFFUSIVE:
        newAlert = {
          id: Math.random().toString(),
          time: timeStr,
          msg: "NOTIFICACIÓN TÉCNICA: Emergencia de magma basáltico fluido. Tremor armónico continuo registrado.",
          type: 'info'
        };
        break;
      case EruptionStage.EXPLOSIVE:
        newAlert = {
          id: Math.random().toString(),
          time: timeStr,
          msg: "¡CRÍTICO - ALERTA ROJA!: Explosión pliniana. Columnas eruptivas superan los 10km. Flujos piroclásticos reportados.",
          type: 'danger'
        };
        break;
      case EruptionStage.COLLAPSE:
        newAlert = {
          id: Math.random().toString(),
          time: timeStr,
          msg: "AVISO SISMOLÓGICO: Colapso estructural detectado. Sismos de baja frecuencia asociados al reasentamiento.",
          type: 'warning'
        };
        break;
    }

    setAlerts((prev) => [newAlert, ...prev].slice(0, 30));
  }, [currentStage]);

  // Auto scroll alerts container to top
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [alerts]);

  // Visual percentages for scientific meters
  const getPercentage = (val: number, max: number) => {
    return Math.min(100, Math.max(3, (val / max) * 100));
  };

  return (
    <div className="w-full flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl overflow-y-auto max-h-[85vh]">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">Telemetría de Volcanes</h3>
            <p className="text-[10px] font-mono text-slate-400">Estación de Monitoreo Vulcano-Sismológico</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-mono font-semibold text-emerald-400">EN VIVO</span>
        </div>
      </div>

      {/* METERS GRID */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Seismicity Card */}
        <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-4 h-4 text-rose-500" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Sismicidad</span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">Sismos/hr</span>
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-extrabold text-rose-400">{metrics.seismicity.toFixed(0)}</span>
            <span className="text-[9px] font-mono text-slate-500">VT/LP</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${getPercentage(metrics.seismicity, 180)}%` }}
            />
          </div>
        </div>

        {/* Magma Pressure Card */}
        <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Gauge className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Presión Cámara</span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">MPa</span>
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-extrabold text-amber-400">{metrics.magmaPressure.toFixed(1)}</span>
            <span className="text-[9px] font-mono text-slate-500">Megapascales</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${getPercentage(metrics.magmaPressure, 150)}%` }}
            />
          </div>
        </div>

        {/* Crater Temperature Card */}
        <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Temp. Cráter</span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">°C</span>
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-extrabold text-orange-400">{metrics.craterTemp.toFixed(0)}</span>
            <span className="text-[9px] font-mono text-slate-500">Grados C</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-orange-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${getPercentage(metrics.craterTemp, 1200)}%` }}
            />
          </div>
        </div>

        {/* Gas SO2 Emissions Card */}
        <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Gases (SO₂)</span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">Ton/Día</span>
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-extrabold text-cyan-400">{metrics.gasSO2.toFixed(0)}</span>
            <span className="text-[9px] font-mono text-slate-500">T/D dióxido</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${getPercentage(metrics.gasSO2, 10000)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tiltmeter and viscosity readout */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            <Mountain className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tiltímetro (Deformación)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-mono font-bold text-indigo-300">
              {metrics.groundTilt > 0 ? `+${metrics.groundTilt.toFixed(1)}` : metrics.groundTilt.toFixed(1)} µrad
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {metrics.groundTilt > 15 ? 'INFLACIÓN ALTA' : metrics.groundTilt < 0 ? 'DEFLACIÓN' : 'ESTABLE'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/70 rounded-xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>Viscosidad Magma</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-teal-300 uppercase truncate">
              {stageInfo.magmaViscosity}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {stageInfo.gasContent === 'Bajo' ? 'BAJO GAS' : 'GAS ATRAPADO'}
            </span>
          </div>
        </div>
      </div>

      {/* SEISMOGRAPH line chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">Sismógrafo en Tiempo Real</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
            <span>Filtro: LP & VT</span>
            <span className="text-slate-700">|</span>
            <span>Estación: SUM-A1</span>
          </div>
        </div>

        {/* SVG Scrolling Graph */}
        <div className="w-full h-32 bg-slate-950 relative border border-slate-900 rounded overflow-hidden">
          {/* Grid lines behind */}
          <div className="absolute inset-0 grid grid-rows-4 grid-cols-10 pointer-events-none opacity-10">
            {Array(4).fill(0).map((_, i) => (
              <div key={`h-${i}`} className="w-full border-t border-slate-400" style={{ top: `${(i+1)*20}%` }} />
            ))}
            {Array(10).fill(0).map((_, i) => (
              <div key={`v-${i}`} className="h-full border-l border-slate-400" style={{ left: `${(i+1)*10}%` }} />
            ))}
          </div>

          {/* SVG Line path */}
          <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
            <path
              d={`M ${seismicHistory.map((val, idx) => {
                // Map coordinates: idx is X (0 to 500), val is Y (0 to 120)
                const x = (idx / (seismicHistory.length - 1)) * 500;
                // Invert Y so higher sismicidad is higher on screen (from top=0)
                // Seismicity range typically 0 to 180, map to 110 to 10
                const y = 110 - (val / 200) * 100;
                return `${x} ${y}`;
              }).join(' L ')}`}
              fill="none"
              stroke={currentStage === EruptionStage.EXPLOSIVE ? '#ef4444' : currentStage === EruptionStage.PRESSURIZATION ? '#f59e0b' : '#10b981'}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Alert / Tremor indicators overlay */}
          <div className="absolute bottom-1 right-2 pointer-events-none font-mono text-[8px] text-slate-500 bg-slate-950/80 px-1 py-0.5 rounded">
            Frecuencia: {currentStage === EruptionStage.EFFUSIVE ? '1.5 - 3.2 Hz' : currentStage === EruptionStage.EXPLOSIVE ? '0.5 - 8.0 Hz (Saturado)' : 'Línea de Base'}
          </div>
        </div>
      </div>

      {/* SEISMIC EVENTS & ALERTS LOGGER */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
          <Bell className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
          <span>Bitácora de Observaciones Sismológicas</span>
        </div>

        <div 
          ref={scrollContainerRef}
          className="h-28 overflow-y-auto flex flex-col gap-1.5 pr-1 text-[10px] font-mono scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {alerts.map((al) => (
            <div 
              key={al.id} 
              className={`p-2 rounded border flex flex-col gap-0.5 leading-normal ${
                al.type === 'danger'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : al.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[8px] opacity-75">
                <span className="font-bold flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${al.type === 'danger' ? 'bg-red-400' : al.type === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  {al.type === 'danger' ? 'ALERTA MÁXIMA' : al.type === 'warning' ? 'ADVERTENCIA' : 'INFO SENSOR'}
                </span>
                <span>{al.time}</span>
              </div>
              <div>{al.msg}</div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-slate-600 text-center py-8">Iniciando sensores del domo...</div>
          )}
        </div>
      </div>
    </div>
  );
}
