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
    <div className="bg-gradient-to-b from-[#C0001A] via-[#8B0000] to-[#3D0000] px-4 font-nunito" style={{ height: "100vh", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-[16px] w-full max-w-[520px] flex flex-col items-center text-center border border-black/6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", margin: "auto", padding: "24px 32px", gap: "8px" }}
      >
        <div style={{ marginBottom: "8px" }}>
          <Logo className="w-[110px] h-[110px] md:w-[140px] md:h-[140px]" style={{ objectFit: "contain" }} />
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
          style={{ marginTop: "8px" }}
        >
          <Check size={40} strokeWidth={3} className="text-green-600" />
        </motion.div>

        <h1 className="text-[1.8rem] md:text-[1.9rem] font-lilita text-[#B30000]" style={{ fontSize: "clamp(1.8rem, 4vw, 1.9rem)" }}>
          Thank You So Much! 🙏
        </h1>

        <p className="font-nunito font-semibold text-[#777777] max-w-[420px]" style={{ fontSize: "clamp(1rem, 2vw, 1rem)", lineHeight: "1.4" }}>
          Your feedback has been submitted successfully. We truly appreciate your time and value your opinion!
        </p>

        <div className="w-full bg-[#FAFAFA] border border-[#EEEEEE] rounded-[12px]" style={{ padding: "16px" }}>
          <p className="text-[#8B0000] font-nunito font-bold italic" style={{ fontSize: "clamp(0.95rem, 2vw, 0.95rem)" }}>
            We hope to see you again soon at Bomb Rolls and Bowls!
          </p>
        </div>

        <Button
          onClick={() => navigate("/")}
          data-testid="button-back-home"
          className="w-full bg-[#8B0000] hover:bg-[#a51d1d] text-white font-nunito font-black md:text-[1rem] h-auto py-3 rounded-[12px] flex items-center justify-between px-6 transition-all duration-200"
          style={{ fontSize: "clamp(1rem, 2vw, 1rem)" }}
        >
          <Home size={20} />
          <span>Back to Home</span>
          <ArrowRight size={20} />
        </Button>

        <p className="mt-4 text-[11px] tracking-widest font-bold text-white/60 uppercase font-nunito">
          Have a wonderful day!
        </p>
      </motion.div>
    </div>
  );
}
