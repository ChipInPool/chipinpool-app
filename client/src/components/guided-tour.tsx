import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Compass } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  desktopOnly?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-testid="button-wallet"]',
    title: "Wallet Balance",
    description: "Your wallet balance shows your available funds. Deposit money to start contributing to pools.",
    desktopOnly: true,
  },
  {
    target: '[data-testid="button-start-pool"]',
    title: "Start Pool Button",
    description: "Create a new pool to collect money from friends for trips, gifts, events, or shared expenses.",
    desktopOnly: true,
  },
  {
    target: '[data-testid="quick-action-create-pool"]',
    title: "Quick Actions - New Pool",
    description: "Quick actions let you jump right into creating pools, depositing funds, exploring pools, and managing your cards.",
  },
  {
    target: '[data-testid="quick-action-deposit"]',
    title: "Quick Actions - Deposit",
    description: "Add funds to your wallet using a debit card or bank account. Your balance is used for pool contributions.",
  },
  {
    target: '[data-testid="quick-action-explore"]',
    title: "Quick Actions - Explore",
    description: "Discover public pools you can join, or find friends to follow and see what they're contributing to.",
  },
  {
    target: '[data-testid="button-notifications"]',
    title: "Notifications Bell",
    description: "Stay up to date with pool contributions, milestones, and other important updates.",
    desktopOnly: true,
  },
  {
    target: '[data-testid="avatar-user"]',
    title: "Profile Avatar",
    description: "Access your profile, payment methods, security settings, and more from your account menu.",
    desktopOnly: true,
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: "above" | "below" }>({ top: 0, left: 0, placement: "below" });
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const filteredSteps = isMobile
    ? TOUR_STEPS.filter((s) => !s.desktopOnly)
    : TOUR_STEPS;

  const step = filteredSteps[currentStep];

  const updatePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      const padding = 12;
      const tooltipHeight = 220;
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement = spaceBelow > tooltipHeight + padding ? "below" : "above";

      let top: number;
      if (placement === "below") {
        top = rect.bottom + padding;
      } else {
        top = rect.top - tooltipHeight - padding;
      }

      let left = rect.left + rect.width / 2 - 160;
      left = Math.max(16, Math.min(left, window.innerWidth - 336));
      top = Math.max(16, top);

      setTooltipPosition({ top, left, placement });
    }, 300);
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step) {
      updatePosition();
    }
  }, [isOpen, currentStep, step, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, updatePosition]);

  const handleNext = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleFinish = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 200);
  };

  if (!isOpen) return null;

  const spotlightPadding = 8;
  const spotlightRadius = 12;

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
      data-testid="guided-tour-overlay"
    >
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - spotlightPadding}
                y={targetRect.top - spotlightPadding}
                width={targetRect.width + spotlightPadding * 2}
                height={targetRect.height + spotlightPadding * 2}
                rx={spotlightRadius}
                ry={spotlightRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={handleFinish}
        />
      </svg>

      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - spotlightPadding,
            top: targetRect.top - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
          }}
        />
      )}

      {step && (
        <div
          ref={tooltipRef}
          className="absolute w-[320px] bg-card border border-border rounded-xl shadow-2xl p-5 transition-all duration-300 ease-out"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: isVisible ? "translateY(0)" : "translateY(8px)",
          }}
          data-testid="guided-tour-tooltip"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Step {currentStep + 1} of {filteredSteps.length}
              </span>
            </div>
            <button
              onClick={handleFinish}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="tour-button-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-display font-bold text-foreground mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={handleFinish}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="tour-button-skip"
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
                  data-testid="tour-button-back"
                >
                  <ChevronLeft className="w-3 h-3" /> Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                data-testid="tour-button-next"
              >
                {currentStep === filteredSteps.length - 1 ? "Finish" : "Next"}
                {currentStep < filteredSteps.length - 1 && <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mt-4">
            {filteredSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === currentStep ? "w-4 bg-primary" : i < currentStep ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
