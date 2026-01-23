import { useEffect } from "react";
import { motion } from "framer-motion";
import { Coffee, CheckCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          <div className="relative inline-block">
            <Logo className="w-24 h-24" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute -top-2 -right-2"
            >
              <CheckCircle className="w-10 h-10 text-accent fill-accent/20" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-foreground mb-4"
        >
          Thank You!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground mb-8"
        >
          Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm text-foreground">
              We hope to see you again soon at <strong>Bomb Rolls and Bowls</strong>
            </p>
          </div>

          <Button
            variant="outline"
            className="no-default-hover-elevate no-default-active-elevate"
            onClick={() => navigate("/")}
            data-testid="button-back-home"
          >
            Back to Home
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-sm text-muted-foreground"
        >
          Have a wonderful day!
        </motion.p>
      </motion.div>
    </div>
  );
}
