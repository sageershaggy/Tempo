import React, { useState } from 'react';
import { Screen } from '../types';
import { configManager } from '../config';

export const OnboardingScreen: React.FC<{ setScreen: (s: Screen) => void }> = ({ setScreen }) => {
  const [step, setStep] = useState(0);

  // Load onboarding steps from config
  const config = configManager.getConfig();
  const steps = config.onboarding;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setScreen(Screen.TIMER);
    }
  };

  return (
    <div className="h-[600px] w-full flex flex-col bg-background-dark relative">
        {/* Skip Button */}
        <div className="absolute top-12 right-6 z-20">
            <button onClick={() => setScreen(Screen.TIMER)} className="text-sm font-bold text-muted hover:text-white transition-colors">Skip</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
                <div className={`absolute inset-0 opacity-10 rounded-full blur-3xl bg-current ${steps[step].color}`}></div>
                <div className="w-full h-full bg-surface-light rounded-3xl border border-white/5 flex items-center justify-center shadow-2xl relative z-10 transition-all duration-500">
                    <span className={`material-symbols-outlined text-8xl ${steps[step].color}`}>
                        {steps[step].icon}
                    </span>
                </div>
            </div>

            <h2 className="text-3xl font-bold mb-4 animate-fade-in leading-tight">
                {steps[step].title.split(' ').slice(0, -1).join(' ')} <span className={steps[step].color}>{steps[step].title.split(' ').pop()}</span>
            </h2>
            <p className="text-muted text-lg leading-relaxed animate-fade-in">
                {steps[step].desc}
            </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-12 pt-4 bg-gradient-to-t from-background-dark to-transparent">
            {/* Dots */}
            <div className="flex justify-center gap-2 mb-8">
                {steps.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-surface-light'}`} />
                ))}
            </div>

            <button 
                onClick={handleNext}
                className="w-full h-14 bg-primary hover:bg-primary-light text-white rounded-xl font-bold text-lg shadow-[0_4px_20px_-4px_rgba(127,19,236,0.5)] flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
                {step === steps.length - 1 ? 'Get Started' : 'Continue'}
                <span className="material-symbols-outlined">arrow_forward</span>
            </button>
        </div>
    </div>
  );
};