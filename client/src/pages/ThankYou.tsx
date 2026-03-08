import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";

export default function ThankYou() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ["#8B4513", "#228B22", "#F5F5DC", "#DAA520"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#C0001A] via-[#8B0000] to-[#3D0000] flex items-center justify-center px-4 font-nunito">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-[16px] w-full max-w-[520px] p-6 flex flex-col items-center text-center border border-black/6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        <div className="mb-6">
          <Logo className="w-20 h-20" />
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
        >
          <Check size={40} strokeWidth={3} className="text-green-600" />
        </motion.div>

        <h1 className="text-[48px] font-bold font-bangers text-[#C0001A] mb-4">
          You're Bomb!
        </h1>

        <p className="text-[14px] font-nunito font-normal text-[#777777] leading-relaxed mb-6 max-w-[420px]">
          Your feedback has been submitted successfully. We truly appreciate your time and value your opinion!
        </p>

        <div className="w-full bg-[#FAFAFA] border border-[#EEEEEE] rounded-[12px] p-4 mb-8">
          <p className="text-[14px] text-[#8B0000] font-nunito font-semibold">
            We hope to see you again soon at Bomb Rolls and Bowls!
          </p>
        </div>

        <Button
          onClick={() => navigate("/")}
          data-testid="button-back-home"
          className="w-full bg-[#8B0000] hover:bg-[#a51d1d] text-white font-nunito font-bold text-[14px] h-auto py-3 rounded-[12px] flex items-center justify-between px-6 transition-all duration-200"
        >
          <Home size={20} />
          <span>Back to Home</span>
          <ArrowRight size={20} />
        </Button>

        <p className="mt-8 text-[11px] tracking-widest font-bold text-white/60 uppercase font-nunito">
          Have a wonderful day!
        </p>
      </motion.div>
    </div>
  );
}
