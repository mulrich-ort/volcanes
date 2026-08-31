import React, { useState } from 'react';
import { EruptionStage, ERUPTION_STAGES, VOLCANO_QUIZ, QuizQuestion } from '../types';
import { BookOpen, GraduationCap, ArrowRight, CheckCircle, XCircle, Info, Award, HelpCircle } from 'lucide-react';

interface EducationalGuideProps {
  currentStage: EruptionStage;
}

export default function EducationalGuide({ currentStage }: EducationalGuideProps) {
  const stageInfo = ERUPTION_STAGES[currentStage];
  
  // Quiz state
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleAnswerSelect = (optIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswer(optIdx);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || quizSubmitted) return;
    
    const question = VOLCANO_QUIZ[currentQuizIndex];
    if (selectedAnswer === question.correctAnswer) {
      setScore((prev) => prev + 1);
    }
    
    setQuizSubmitted(true);
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setQuizSubmitted(false);

    if (currentQuizIndex < VOLCANO_QUIZ.length - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setQuizSubmitted(false);
    setScore(0);
    setQuizCompleted(false);
  };

  const currentQuestion = VOLCANO_QUIZ[currentQuizIndex];

  return (
    <div className="w-full flex flex-col gap-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl overflow-y-auto max-h-[85vh]">
      
      {/* TABS HEADER (EDUCATIONAL OR ASSESSMENT) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <BookOpen className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">Guía Educativa Científica</h3>
          <p className="text-[10px] font-mono text-slate-400">Vulcanología Interactiva y Evaluación de Conocimientos</p>
        </div>
      </div>

      {/* STAGE ANALYSIS SECTION */}
      <div className="flex flex-col gap-3.5 bg-slate-950/60 border border-slate-800/70 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[11px] font-mono font-bold uppercase text-slate-400">Etapa de Observación</span>
          </div>
          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${stageInfo.color}`}>
            {stageInfo.name}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-slate-200 mt-1">{stageInfo.subtitle}</h4>
        <p className="text-xs leading-relaxed text-slate-400 font-sans">{stageInfo.description}</p>

        {/* Geological Details Bullet list */}
        <div className="mt-2.5">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Evidencias Físicas & Procesos Internos</span>
          </div>
          <ul className="flex flex-col gap-2">
            {stageInfo.scientificDetails.map((detail, idx) => (
              <li key={idx} className="flex gap-2 items-start text-xs text-slate-300 leading-relaxed font-sans">
                <span className="text-emerald-500 font-bold mt-0.5 flex-shrink-0">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* QUIZ SECTION */}
      <div className="flex flex-col gap-4 bg-slate-950/40 border border-slate-800/60 rounded-xl p-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4.5 h-4.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Evaluación del Estudiante</span>
          </div>
          {!quizCompleted && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Pregunta {currentQuizIndex + 1} de {VOLCANO_QUIZ.length}
            </span>
          )}
        </div>

        {!quizCompleted ? (
          <div className="flex flex-col gap-3.5">
            {/* Question Text */}
            <div className="flex gap-2 items-start">
              <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <h5 className="text-xs font-medium text-slate-300 leading-relaxed font-sans">
                {currentQuestion.question}
              </h5>
            </div>

            {/* Options List */}
            <div className="flex flex-col gap-2">
              {currentQuestion.options.map((opt, optIdx) => {
                let btnStyle = 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60';
                
                if (selectedAnswer === optIdx) {
                  btnStyle = 'bg-indigo-500/10 border-indigo-500 text-indigo-300';
                }

                if (quizSubmitted) {
                  if (optIdx === currentQuestion.correctAnswer) {
                    btnStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
                  } else if (selectedAnswer === optIdx) {
                    btnStyle = 'bg-red-500/10 border-red-500 text-red-400';
                  } else {
                    btnStyle = 'bg-slate-900/40 border-slate-800/40 text-slate-500 cursor-not-allowed';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={quizSubmitted}
                    onClick={() => handleAnswerSelect(optIdx)}
                    className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between font-sans ${btnStyle}`}
                    id={`quiz-option-${optIdx}`}
                  >
                    <span>{opt}</span>
                    {quizSubmitted && optIdx === currentQuestion.correctAnswer && (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                    )}
                    {quizSubmitted && selectedAnswer === optIdx && optIdx !== currentQuestion.correctAnswer && (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons & Feedback */}
            {quizSubmitted && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs leading-relaxed text-slate-300 font-sans">
                <strong className="text-[10px] font-mono text-emerald-400 block uppercase tracking-wider mb-1">
                  Explicación Científica:
                </strong>
                {currentQuestion.explanation}
              </div>
            )}

            <div className="flex justify-end mt-2">
              {!quizSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    selectedAnswer === null
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border border-emerald-400/30 shadow-lg cursor-pointer'
                  }`}
                  id="btn-quiz-submit"
                >
                  <span>CORREGIR RESPUESTA</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-indigo-100 border border-indigo-400/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
                  id="btn-quiz-next"
                >
                  <span>{currentQuizIndex < VOLCANO_QUIZ.length - 1 ? 'SIGUIENTE PREGUNTA' : 'VER RESULTADO FINAL'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Quiz Results Dashboard */
          <div className="flex flex-col items-center py-4 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-bounce">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex flex-col gap-1">
              <h5 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider">¡Evaluación Finalizada!</h5>
              <p className="text-xs text-slate-400 leading-normal max-w-xs font-sans">
                Has completado la prueba de sensores de vulcanología. Tu nivel de respuesta ante desastres volcánicos es:
              </p>
            </div>

            {/* Score circle gauge */}
            <div className="relative w-24 h-24 flex items-center justify-center my-1.5">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-emerald-400"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - score / VOLCANO_QUIZ.length)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-2xl font-extrabold text-emerald-400">{score}</span>
                <span className="text-[9px] text-slate-500">de {VOLCANO_QUIZ.length}</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-300">
              {score === VOLCANO_QUIZ.length ? (
                <span className="text-emerald-400">Vulcanólogo(a) Experto(a) - 100% de Aciertos</span>
              ) : score >= 3 ? (
                <span className="text-indigo-400">Operador(a) Certificado(a) de Monitoreo</span>
              ) : (
                <span className="text-amber-400">Asistente en Entrenamiento - Requiere Repaso</span>
              )}
            </div>

            <button
              onClick={handleRestartQuiz}
              className="mt-2.5 px-4.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60 rounded-xl text-xs font-mono font-bold transition-all shadow-lg"
              id="btn-quiz-restart"
            >
              NUEVO EXAMEN
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
