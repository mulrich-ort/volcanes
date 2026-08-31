export enum EruptionStage {
  DORMANT = 'DORMANT',
  PRESSURIZATION = 'PRESSURIZATION',
  EFFUSIVE = 'EFFUSIVE',
  EXPLOSIVE = 'EXPLOSIVE',
  COLLAPSE = 'COLLAPSE'
}

export interface StageInfo {
  id: EruptionStage;
  name: string;
  subtitle: string;
  description: string;
  scientificDetails: string[];
  magmaViscosity: string;
  gasContent: string;
  color: string; // Tailwind class
  glowColor: string; // Hex color for Three.js emissive/lights
  metricsRange: {
    seismicity: { min: number; max: number; label: string };
    magmaPressure: { min: number; max: number; label: string };
    craterTemp: { min: number; max: number; label: string };
    gasSO2: { min: number; max: number; label: string };
    groundTilt: { min: number; max: number; label: string };
  };
}

export interface LiveMetrics {
  seismicity: number;     // Micro-sismos/hora (0-200)
  magmaPressure: number;  // Megapascales MPa (0-150)
  craterTemp: number;     // Grados centígrados (0-1200)
  gasSO2: number;         // Toneladas/día (0-10000)
  groundTilt: number;     // Micro-radianes (deformación) (-10 a 60)
  currentTime: string;    // Timestamp ficticio
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const ERUPTION_STAGES: Record<EruptionStage, StageInfo> = {
  [EruptionStage.DORMANT]: {
    id: EruptionStage.DORMANT,
    name: "Reposo / Dormido",
    subtitle: "Actividad basal estable",
    description: "El volcán se encuentra en un estado pasivo. El magma permanece a gran profundidad y la actividad superficial es nula o se limita a pequeñas emisiones de vapor de agua. Es el momento perfecto para estudiar la estructura base de la corteza y la sismología de fondo.",
    scientificDetails: [
      "Sismicidad residual causada por asentamiento tectónico o hidrotermal menor.",
      "Cámara magmática profunda, estable y con temperatura constante.",
      "Bajas emisiones gaseosas (principalmente vapor de agua, H2O).",
      "Inclinación del terreno sin variaciones (deformación de fondo)."
    ],
    magmaViscosity: "N/A (Cámara estable)",
    gasContent: "Bajo (Principalmente Vapor)",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    glowColor: "#10b981",
    metricsRange: {
      seismicity: { min: 2, max: 8, label: "Micro-sismos/hora" },
      magmaPressure: { min: 4, max: 6, label: "Megapascales (MPa)" },
      craterTemp: { min: 25, max: 40, label: "Grados Celsius (°C)" },
      gasSO2: { min: 5, max: 15, label: "Toneladas/día" },
      groundTilt: { min: -1, max: 1, label: "Micro-radianes (µrad)" }
    }
  },
  [EruptionStage.PRESSURIZATION]: {
    id: EruptionStage.PRESSURIZATION,
    name: "Presurización / Intrusión",
    subtitle: "Ascenso magmático activo",
    description: "Nuevo magma caliente asciende por el manto, penetrando en la cámara magmática e interactuando con el sistema hidrotermal. Esto provoca una rápida acumulación de presión, sismos de fractura de roca, abombamiento del terreno y liberación de gases magmáticos corrosivos como el dióxido de azufre.",
    scientificDetails: [
      "Enjambre de sismos volcano-tectónicos por fracturamiento de roca encajonante.",
      "Inflación acelerada del edificio volcánico (medida con tiltímetros e inclinómetros).",
      "Aumento drástico en la temperatura de fumarolas y el cráter.",
      "Aparición de sismos tipo 'Trepidador' (Tremor Armónico), que indican magma en movimiento."
    ],
    magmaViscosity: "Media-Alta",
    gasContent: "Ascendente (SO2, CO2, H2S)",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    glowColor: "#f59e0b",
    metricsRange: {
      seismicity: { min: 45, max: 85, label: "Micro-sismos/hora" },
      magmaPressure: { min: 40, max: 55, label: "Megapascales (MPa)" },
      craterTemp: { min: 180, max: 280, label: "Grados Celsius (°C)" },
      gasSO2: { min: 250, max: 450, label: "Toneladas/día" },
      groundTilt: { min: 15, max: 25, label: "Micro-radianes (µrad)" }
    }
  },
  [EruptionStage.EFFUSIVE]: {
    id: EruptionStage.EFFUSIVE,
    name: "Erupción Efusiva / Hawaiana",
    subtitle: "Ríos de lava fluida",
    description: "El magma de baja viscosidad (típicamente basáltico) y con bajo contenido de gases disueltos brota suavemente a la superficie. La presión se libera sin grandes explosiones, dando origen a ríos e impresionantes canales de lava incandescente que se deslizan por las laderas del volcán a temperaturas extremas.",
    scientificDetails: [
      "Lava basáltica muy caliente (~1100°C) de gran fluidez.",
      "Predominio de Tremor de flujo continuo debido al movimiento de lava por los canales.",
      "Emisiones elevadas pero estables de gases de azufre y CO2.",
      "Ligera deflación del terreno a medida que el magma se descarga."
    ],
    magmaViscosity: "Baja (Alta Fluidez)",
    gasContent: "Moderado (Escape pasivo)",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    glowColor: "#f97316",
    metricsRange: {
      seismicity: { min: 25, max: 40, label: "Micro-sismos/hora (Tremor continuo)" },
      magmaPressure: { min: 65, max: 75, label: "Megapascales (MPa)" },
      craterTemp: { min: 1050, max: 1180, label: "Grados Celsius (°C)" },
      gasSO2: { min: 1800, max: 2600, label: "Toneladas/día" },
      groundTilt: { min: 5, max: 12, label: "Micro-radianes (µrad)" }
    }
  },
  [EruptionStage.EXPLOSIVE]: {
    id: EruptionStage.EXPLOSIVE,
    name: "Erupción Explosiva / Pliniana",
    subtitle: "Cataclismo de ceniza y piroclastos",
    description: "¡Fase crítica! Magma viscoso y rico en gases obstruye el conducto principal hasta que la presión supera la resistencia de la roca. Se produce una violenta descompresión y detonaciones masivas, disparando una densa columna eruptiva de ceniza y gases a la estratosfera, caída de piroclastos (bombas volcánicas) y colapsos con flujos piroclásticos incandescentes a alta velocidad.",
    scientificDetails: [
      "Señales sísmicas extremas dominadas por explosiones continuas y trepidación violenta.",
      "Formación de columnas eruptivas que pueden superar los 20 km de altura.",
      "Peligro de flujos piroclásticos (nubes de gas ardiente y roca a >800°C y >200 km/h).",
      "Máximas tasas registradas de emisión de dióxido de azufre (SO2)."
    ],
    magmaViscosity: "Muy Alta (Riolítica/Andesítica)",
    gasContent: "Extremadamente Alto (Atrapado)",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    glowColor: "#ef4444",
    metricsRange: {
      seismicity: { min: 110, max: 180, label: "Micro-sismos/hora (Explosivo)" },
      magmaPressure: { min: 110, max: 135, label: "Megapascales (MPa)" },
      craterTemp: { min: 780, max: 920, label: "Grados Celsius (°C)" },
      gasSO2: { min: 7500, max: 9800, label: "Toneladas/día" },
      groundTilt: { min: 40, max: 55, label: "Micro-radianes (µrad)" }
    }
  },
  [EruptionStage.COLLAPSE]: {
    id: EruptionStage.COLLAPSE,
    name: "Colapso y Calma Post-Eruptiva",
    subtitle: "Formación de caldera y fumarolas",
    description: "Tras la inmensa eyección de material, la cámara magmática queda parcialmente vacía. Al perder su soporte, el techo de la cámara colapsa hacia el interior, creando una enorme fosa circular o caldera. El volcán entra en calma, con fumarolas activas, emisión de gases hidrotermales y enfriamiento paulatino del sistema.",
    scientificDetails: [
      "Sismos de colapso de baja frecuencia debido al reasentamiento estructural del edificio volcánico.",
      "Deflación negativa drástica de la superficie volcánica.",
      "Disminución paulatina de la temperatura del cráter e incremento de actividad hidrotermal.",
      "Precipitación de azufre elemental en las paredes del cráter y fumarolas."
    ],
    magmaViscosity: "N/A",
    gasContent: "Moderado-Bajo (Azufre, Vapor)",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    glowColor: "#06b6d4",
    metricsRange: {
      seismicity: { min: 12, max: 28, label: "Micro-sismos/hora (Asentamiento)" },
      magmaPressure: { min: 12, max: 18, label: "Megapascales (MPa)" },
      craterTemp: { min: 95, max: 160, label: "Grados Celsius (°C)" },
      gasSO2: { min: 120, max: 240, label: "Toneladas/día" },
      groundTilt: { min: -8, max: -3, label: "Micro-radianes (µrad)" }
    }
  }
};

export const VOLCANO_QUIZ: QuizQuestion[] = [
  {
    id: 1,
    question: "¿Qué tipo de sismicidad es el indicador clave de que el magma se está moviendo a través de los conductos volcánicos?",
    options: [
      "Sismos de fractura tectónica regional",
      "Tremor armónico de baja y media frecuencia",
      "Sismos de marea oceánica inducida",
      "Sismos superficiales por viento atmosférico"
    ],
    correctAnswer: 1,
    explanation: "El tremor armónico es una vibración sísmica continua producida por la resonancia del magma y los gases calientes fluyendo activamente a través de los conductos internos del volcán."
  },
  {
    id: 2,
    question: "Si observas que los tiltímetros (inclinómetros) registran un aumento positivo continuo (ej. +25 microradianes), ¿qué proceso científico está ocurriendo?",
    options: [
      "El volcán se está enfriando y encogiendo",
      "La cámara magmática se está vaciando rápidamente",
      "Inflación del edificio volcánico por ascenso y presurización magmática",
      "Un deslizamiento de tierra por lluvias intensas"
    ],
    correctAnswer: 2,
    explanation: "El ascenso y la acumulación de magma presuriza las rocas circundantes, provocando que los flancos del edificio volcánico se inflen físicamente. Esto se mide como un aumento de inclinación en microradianes."
  },
  {
    id: 3,
    question: "¿Cuál es el principal gas volcánico nocivo que se monitorea de cerca para predecir la inminencia de una erupción eruptiva magmática?",
    options: [
      "Nitrógeno puro (N2)",
      "Helio molecular (He)",
      "Dióxido de Azufre (SO2)",
      "Vapor de agua destilada"
    ],
    correctAnswer: 3,
    explanation: "El Dióxido de Azufre (SO2) es un gas magmático soluble que se libera rápidamente a medida que el magma asciende y disminuye la presión. Tasas crecientes de SO2 indican magma activo cerca de la superficie."
  },
  {
    id: 4,
    question: "¿Por qué las erupciones efusivas suelen ser menos violentas que las erupciones plinianas (explosivas)?",
    options: [
      "Porque el magma efusivo tiene baja viscosidad y los gases escapan fácilmente",
      "Porque ocurren bajo el agua y el agua apaga las llamas instantáneamente",
      "Porque el volcán es más pequeño y tiene menos fuerza",
      "Porque los satélites reducen artificialmente la presión"
    ],
    correctAnswer: 0,
    explanation: "La baja viscosidad del magma (común en basaltos) permite que los gases disueltos se liberen de manera continua y pasiva, evitando la acumulación extrema de presión que genera explosiones violentas."
  },
  {
    id: 5,
    question: "¿Qué es un flujo piroclástico y por qué se considera el peligro volcánico más letal durante una erupción explosiva?",
    options: [
      "Un río de lodo helado que fluye por los valles",
      "Una nube turbulenta de gas extremadamente caliente, ceniza y rocas que viaja a cientos de km/h",
      "La lluvia ácida que corroe lentamente los techos de metal",
      "La onda de calor invisible producida por la lava seca"
    ],
    correctAnswer: 1,
    explanation: "El flujo piroclástico es una avalancha ardiente supercaliente de gas y fragmentos de roca de alta densidad que desciende por las laderas volcánicas a velocidades que imposibilitan la evacuación inmediata."
  }
];
