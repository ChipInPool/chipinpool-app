import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

interface FeatureTooltipProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function FeatureTooltip({ id, title, description, children }: FeatureTooltipProps) {
  const storageKey = `chipin_tooltip_dismissed_${id}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; placement: "above" | "below" }>({ top: 0, left: 0, placement: "below" });
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const tooltipHeight = 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow > tooltipHeight + 12 ? "below" : "above";

    let top: number;
    if (placement === "below") {
      top = rect.bottom + 8;
    } else {
      top = rect.top - tooltipHeight - 8;
    }

    let left = rect.left + rect.width / 2 - 130;
    left = Math.max(16, Math.min(left, window.innerWidth - 276));
    top = Math.max(8, top);

    setPosition({ top, left, placement });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        iconRef.current && !iconRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
  };

  if (isDismissed) {
    return <>{children}</>;
  }

  return (
    <span className="relative inline-flex items-start gap-1">
      {children}
      <button
        ref={iconRef}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        onMouseEnter={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
        data-testid={`tooltip-icon-${id}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[1001] w-[260px] bg-card border border-border rounded-xl shadow-xl p-4 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{ top: position.top, left: position.left }}
            data-testid={`tooltip-content-${id}`}
          >
            <div
              className={`absolute w-2.5 h-2.5 bg-card border-border rotate-45 ${
                position.placement === "below"
                  ? "-top-[6px] border-l border-t"
                  : "-bottom-[6px] border-r border-b"
              }`}
              style={{ left: "50%", marginLeft: "-5px" }}
            />
            <h4 className="text-sm font-display font-bold text-foreground mb-1">{title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>
            <button
              onClick={handleDismiss}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              data-testid={`tooltip-dismiss-${id}`}
            >
              Got it
            </button>
          </div>,
          document.body
        )}
    </span>
  );
}
