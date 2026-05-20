import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  BarChart3,
  BookOpen,
  Bell,
  Check,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";

const STORAGE_KEY = "tcp-onboarding-done";

const CALCULATORS = [
  "Lot Size",
  "Pattern Trading",
  "Monte Carlo",
  "Position Size",
  "Risk/Reward",
  "Pip Value",
  "Compound",
  "Drawdown",
];

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? "w-6 bg-green-500"
              : i === current
              ? "w-6 bg-green-400"
              : "w-2 bg-zinc-600"
          }`}
        />
      ))}
    </div>
  );
}

function Step1({ userName, t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30">
        <TrendingUp className="w-8 h-8 text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {userName ? `${t('onboardingWelcome').replace('!', '')}, ${userName.split(" ")[0]}!` : t('onboardingWelcome')}
        </h2>
        <p className="text-zinc-400 text-sm">{t('onboardingWelcomeSubtitle')}</p>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed max-w-xs">
        {t('onboardingWelcomeDesc')}
      </p>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs text-zinc-400">{t('calculate')}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs text-zinc-400">{t('onboardingStep1Analyze')}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs text-zinc-400">{t('onboardingStep1Register')}</span>
        </div>
      </div>
    </div>
  );
}

function Step2({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30">
        <Calculator className="w-8 h-8 text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">{t('onboardingCalculators')}</h2>
        <p className="text-zinc-400 text-sm">{t('onboardingCalcSubtitle')}</p>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed max-w-xs">
        {t('onboardingCalcDesc')}
      </p>
      <div className="grid grid-cols-2 gap-2 w-full mt-1">
        {CALCULATORS.map((name) => (
          <div
            key={name}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700"
          >
            <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span className="text-xs text-zinc-200 font-medium">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step3({ t }) {
  const tabs = [
    { icon: Calculator, label: t('onboardingCalculators'), desc: t('onboardingTabCalcsDesc') },
    { icon: BookOpen, label: t('onboardingTabJournal'), desc: t('onboardingTabJournalDesc') },
    { icon: Bell, label: t('onboardingTabAlertasPrecio'), desc: t('onboardingTabAlertsDesc') },
    { icon: BarChart3, label: t('onboardingTabHistory'), desc: t('onboardingTabHistoryDesc') },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30">
        <BarChart3 className="w-8 h-8 text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">{t('onboardingDashboard')}</h2>
        <p className="text-zinc-400 text-sm">{t('onboardingDashboardSubtitle')}</p>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed max-w-xs">
        {t('onboardingDashboardDesc')}
      </p>
      <div className="flex flex-col gap-2 w-full mt-1">
        {tabs.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700"
          >
            <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-zinc-100">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Step4({ onComplete, t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30">
        <Check className="w-8 h-8 text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          {t('onboardingReady')}
        </h2>
        <p className="text-zinc-400 text-sm">{t('onboardingAccountReady')}</p>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed max-w-xs">
        {t('onboardingStep4Desc')}
      </p>
      <button
        onClick={onComplete}
        className="flex items-center gap-2 w-full justify-center px-5 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-colors mt-1"
      >
        {t('goToDashboard')}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function OnboardingModal() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    t('onboardingWelcome'),
    t('onboardingCalculators'),
    t('onboardingDashboard'),
    t('onboardingReady'),
  ];

  useEffect(() => {
    if (isAuthenticated && localStorage.getItem(STORAGE_KEY) !== "1") {
      setOpen(true);
    }
  }, [isAuthenticated]);

  function complete() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    }
  }

  function prev() {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }

  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) complete(); }}>
      <DialogContent className="max-w-md bg-zinc-900 border border-zinc-700 text-white p-6 gap-0 [&>button]:text-zinc-400 [&>button]:hover:text-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{steps[step]}</DialogTitle>
        </DialogHeader>

        <ProgressDots current={step} total={steps.length} />

        <div className="min-h-[340px] flex flex-col justify-center">
          {step === 0 && <Step1 userName={user?.name} t={t} />}
          {step === 1 && <Step2 t={t} />}
          {step === 2 && <Step3 t={t} />}
          {step === 3 && <Step4 onComplete={complete} t={t} />}
        </div>

        {!isLast && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
            <button
              onClick={complete}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t('skip')}
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  {t('previous')}
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-black bg-green-500 hover:bg-green-400 transition-colors"
              >
                {t('next')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {isLast && !isFirst && (
          <div className="flex items-center justify-start mt-4 pt-4 border-t border-zinc-800">
            <button
              onClick={prev}
              className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              {t('previous')}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
