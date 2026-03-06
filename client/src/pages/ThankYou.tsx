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
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center px-4 font-poppins">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-[16px] shadow-lg w-full max-w-[420px] p-8 flex flex-col items-center text-center"
      >
        <div className="mb-4">
          <Logo className="w-24 h-24" />
        </div>

        <div className="w-full flex items-center justify-center relative mb-8">
          <div className="w-full h-[1px] bg-gray-100" />
          <div className="absolute w-2 h-2 rounded-full bg-[#F5A623]" />
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-[#e8f5e9] flex items-center justify-center mb-6"
        >
          <Check size={40} strokeWidth={3} className="text-[#22a34a]" />
        </motion.div>

        <h1 className="text-[2rem] font-playfair font-bold mb-4">
          <span className="text-[#3b1a1a]">Thank You</span>
          <span className="text-[#F5A623]">!</span>
        </h1>

        <p className="text-[#5c3317] text-base leading-relaxed mb-8">
          Your feedback has been submitted successfully. We truly appreciate your time!
        </p>

        <div className="w-full bg-[#fdf6ec] border border-[#e8d5b0] rounded-[12px] p-4 mb-8">
          <p className="text-[#8B1A1A] font-bold">
            We hope to see you again soon at Bomb Rolls and Bowls!
          </p>
        </div>

        <Button
          onClick={() => navigate("/")}
          data-testid="button-back-home"
          className="w-full bg-[#8B1A1A] hover:bg-[#a51d1d] text-white font-bold h-auto py-[14px] rounded-[10px] flex items-center justify-between px-6 transition-colors no-default-hover-elevate no-default-active-elevate"
        >
          <Home size={20} />
          <span>Back to Home</span>
          <ArrowRight size={20} />
        </Button>

        <p className="mt-8 text-[10px] tracking-widest font-bold text-[#8B1A1A] uppercase">
          HAVE A WONDERFUL DAY!
        </p>
      </motion.div>
    </div>
  );
}
