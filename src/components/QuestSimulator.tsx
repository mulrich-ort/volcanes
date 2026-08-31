import React, { useState } from 'react';
import { Sparkles, Eye, ShieldAlert, Wifi, Battery, Move, Compass, Zap, Layers, HelpCircle } from 'lucide-react';

interface QuestSimulatorProps {
  currentStageName: string;
  crossSection: boolean;
  setCrossSection: (val: boolean) => void;
  isStereoMode: boolean;
  setIsStereoMode: (val: boolean) => void;
  isPassthrough: boolean;
  setIsPassthrough: (val: boolean) => void;
}

export default function QuestSimulator({
  currentStageName,
  crossSection,
  setCrossSection,
  isStereoMode,
  setIsStereoMode,
  isPassthrough,
  setIsPassthrough
}: QuestSimulatorProps) {
  const [ipdValue, setIpdValue] = useState(64); // Interpupillary distance in mm (Quest 3 default)
  const [showVRInstructions, setShowVRInstructions] = useState(true);

  return (
    <div className="w-full flex flex-col gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">Módulo Meta Quest 3</h3>
            <p className="text-[10px] font-mono text-slate-400">Panel de Configuración y Previsualizador de Casco VR</p>
          </div>
        </div>
        
        {/* Mock Headset battery status */}
        <div className="flex items-center gap-2.5 font-mono text-[9px] text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
          <div className="flex items-center gap-1 text-emerald-400">
            <Battery className="w-3.5 h-3.5" />
            <span>98%</span>
          </div>
          <span className="text-slate-800">|</span>
          <div className="flex items-center gap-1 text-indigo-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi 6E</span>
          </div>
        </div>
      </div>

      {/* QUEST 3 ADVANCED SIMULATION OPTIONS */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Toggle Simulated Eye View (Stereo Split) */}
        <button
          onClick={() => setIsStereoMode(!isStereoMode)}
          className={`p-3 rounded-xl border flex flex-col gap-1.5 text-left transition-all relative overflow-hidden ${
            isStereoMode
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800/50 text-slate-400'
          }`}
          id="btn-toggle-stereo"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Modo Goggles (3D Estéreo)</span>
            <Eye className={`w-4 h-4 ${isStereoMode ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] leading-relaxed font-sans text-slate-300">
            {isStereoMode ? 'Doble visor estereoscópico activo.' : 'Activar división de pantalla para lentes VR.'}
          </span>
          {isStereoMode && (
            <span className="absolute bottom-1 right-2 text-[8px] font-mono text-emerald-400 animate-pulse font-bold">
              ESTÉREO ACTIVO
            </span>
          )}
        </button>

        {/* Toggle Passthrough (Mixed Reality) */}
        <button
          onClick={() => setIsPassthrough(!isPassthrough)}
          className={`p-3 rounded-xl border flex flex-col gap-1.5 text-left transition-all relative overflow-hidden ${
            isPassthrough
              ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800/50 text-slate-400'
          }`}
          id="btn-toggle-passthrough"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">Realidad Mixta (Passthrough)</span>
            <Layers className={`w-4 h-4 ${isPassthrough ? 'text-indigo-400 animate-spin' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] leading-relaxed font-sans text-slate-300">
            {isPassthrough ? 'Entorno real integrado de fondo.' : 'Fondo espacial oscuro por defecto.'}
          </span>
          {isPassthrough && (
            <span className="absolute bottom-1 right-2 text-[8px] font-mono text-indigo-400 animate-pulse font-bold">
              MR / PASSTHROUGH
            </span>
          )}
        </button>
      </div>

      {/* IPD LEN ADJUSTER SLIDER */}
      <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="font-semibold text-slate-400 uppercase tracking-widest">Ajuste de Óptica (IPD Hardware)</span>
          <span className="text-indigo-400 font-bold">{ipdValue} mm</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-slate-600">58mm</span>
          <input
            type="range"
            min="58"
            max="72"
            value={ipdValue}
            onChange={(e) => setIpdValue(Number(e.target.value))}
            className="flex-grow accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded"
          />
          <span className="text-[9px] font-mono text-slate-600">72mm</span>
        </div>
        <p className="text-[9px] font-mono text-slate-500 leading-normal">
          Ajusta la separación focal de las lentes del Quest 3 para optimizar el enfoque 3D estereoscópico y mitigar la fatiga visual.
        </p>
      </div>

      {/* VIRTUAL CONTROLLER MAPPINGS CHART */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
        <div 
          onClick={() => setShowVRInstructions(!showVRInstructions)}
          className="flex items-center justify-between cursor-pointer border-b border-slate-900 pb-1.5"
        >
          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Guía de Controles Meta Touch Plus</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500 select-none hover:text-slate-300">
            {showVRInstructions ? 'OCULTAR' : 'MOSTRAR'}
          </span>
        </div>

        {showVRInstructions && (
          <div className="grid grid-cols-2 gap-3.5 text-[10px] font-mono text-slate-400 leading-relaxed">
            <div className="flex flex-col gap-2 bg-slate-900/60 p-2.5 border border-slate-800/40 rounded-lg">
              <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-rose-500" />
                <span>Controlador Izquierdo</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                <li><strong className="text-rose-400">Stick Analógico:</strong> Desplazamiento por el observatorio (Volar/Aterrizar).</li>
                <li><strong className="text-rose-400">Gatillo Grip:</strong> Agarrar muestras de roca o telescopio virtual.</li>
                <li><strong className="text-rose-400">Botón X/Y:</strong> Resetear posición de cámara al domo central.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 bg-slate-900/60 p-2.5 border border-slate-800/40 rounded-lg">
              <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Controlador Derecho</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                <li><strong className="text-amber-400">Puntero Láser:</strong> Apuntar a los botones del HUD del volcán.</li>
                <li><strong className="text-amber-400">Gatillo Index:</strong> Presionar botones flotantes / Seleccionar etapa.</li>
                <li><strong className="text-amber-400">Botón A/B:</strong> Alternar vista corte de rayos X del volcán.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* EDUCATIONAL METRIC ALERT ON SAFETY IN VR */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2.5 items-start">
        <ShieldAlert className="w-4.5 h-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-[10px] font-mono text-amber-400 leading-normal">
          <strong>Recomendación de Seguridad Quest 3:</strong> Mantén activo el sistema <strong>Space Guardian</strong>. Asegúrate de disponer de un espacio libre de obstáculos de al menos 2x2 metros para la exploración del diorama volcánico a escala 1:1.
        </div>
      </div>
    </div>
  );
}
