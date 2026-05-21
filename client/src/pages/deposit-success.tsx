import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DepositSuccess() {
  const [countdown, setCountdown] = useState(3);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    // Try to open the app immediately
    const timer = setTimeout(() => {
      window.location.href = "chipinpool://deposit-success";
      setAttempted(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!attempted) return;
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(n => n - 1), 1000);
    return () => clearInterval(t);
  }, [attempted, countdown]);

  const openApp = () => {
    window.location.href = "chipinpool://deposit-success";
  };

  return (
    <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center px-6 text-white">
      <div className="w-full max-w-sm text-center space-y-8">

        {/* Logo / icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#7FFFD4]/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[#7FFFD4]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-white/60 mt-1 text-sm">
              Your deposit is being added to your ChipIn wallet.
            </p>
          </div>
        </div>

        {/* Return to app CTA */}
        <div className="space-y-3">
          <Button
            className="w-full bg-[#7FFFD4] hover:bg-[#5fd4b0] text-[#001F3F] font-semibold h-12 text-base"
            onClick={openApp}
            data-testid="button-open-app"
          >
            <Smartphone className="w-5 h-5 mr-2" />
            Open ChipIn App
          </Button>
          <p className="text-xs text-white/40">
            Your balance will update automatically when you return to the app.
          </p>
        </div>

        {/* Web fallback */}
        <div className="border-t border-white/10 pt-6 space-y-3">
          <p className="text-xs text-white/40">Using ChipIn on the web?</p>
          <Link href="/profile">
            <Button
              variant="ghost"
              className="w-full text-white/70 hover:text-white hover:bg-white/10 h-10"
            >
              Go to my wallet <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
