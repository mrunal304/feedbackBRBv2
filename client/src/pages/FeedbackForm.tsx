import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertFeedbackSchema, type InsertFeedback } from "@shared/schema";

const formInputClass = "border-2 border-[#EEEEEE] bg-[#FAFAFA] rounded-[12px] font-nunito font-semibold text-[15px] text-[#333333] placeholder-[#BBBBBB] px-4 py-3 focus:border-[#FFD700] focus:outline-none focus:ring-4 focus:ring-yellow-300/20 transition-all";

export default function FeedbackForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<InsertFeedback>({
    resolver: zodResolver(insertFeedbackSchema),
    defaultValues: {
      name: "",
      phone: "",
      location: "Bomb Rolls and Bowls",
      visitType: "dine_in",
      ratings: {
        foodTaste: 0,
        foodTemperature: 0,
        portionSize: 0,
        valueForMoney: 0,
        presentation: 0,
        overallService: 0,
      },
      comments: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertFeedback) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      const name = form.getValues("name");
      navigate(`/thank-you?name=${encodeURIComponent(name)}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFeedback) => {
    const hasAllRatings = Object.values(data.ratings).every((r) => r >= 1);
    if (!hasAllRatings) {
      toast({
        title: "Missing Ratings",
        description: "Please rate all categories before submitting",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(data);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(["name", "phone", "location", "visitType"]);
      if (valid) setStep(2);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const ratingQuestions = [
    { key: "foodTaste", label: "Food Taste — How did the food taste overall?", icon: "😋" },
    { key: "foodTemperature", label: "Food Temperature — Was your food served at the right temperature?", icon: "🌡️" },
    { key: "portionSize", label: "Portion Size — Were you satisfied with the portion size?", icon: "🍽️" },
    { key: "valueForMoney", label: "Value for Money — Was the food worth the price?", icon: "💰" },
    { key: "presentation", label: "Presentation — How well was the food presented?", icon: "✨" },
    { key: "overallService", label: "Overall Service — How was your overall experience with our staff?", icon: "🤝" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#C0001A] via-[#8B0000] to-[#3D0000] py-8 px-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[520px]"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-4"
          >
            💣
          </motion.div>
          <h1 className="text-4xl font-bold text-white font-bangers tracking-widest">
            BOMB ROLLS & BOWLS
          </h1>
          <p className="text-amber-200 mt-2 font-nunito text-sm">We value your feedback</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white/20 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-[#FFD700]"
            initial={{ width: "50%" }}
            animate={{ width: step === 1 ? "50%" : "100%" }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-white/70 mb-6 font-nunito font-bold">
          <span className={step >= 1 ? "text-[#FFD700]" : ""}>Your Info</span>
          <span className={step >= 2 ? "text-[#FFD700]" : ""}>Rate Us</span>
        </div>

        <div className="bg-white rounded-[16px] p-6 shadow-md border border-black/6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-[28px] font-bold text-[#8B0000] font-bangers">
                    Your Info
                  </h2>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-bold text-[#444444] uppercase tracking-widest font-nunito">Your Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your name"
                            {...field}
                            data-testid="input-name"
                            className={formInputClass}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-bold text-[#444444] uppercase tracking-widest font-nunito">Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 234 567 8900"
                            {...field}
                            data-testid="input-phone"
                            className={formInputClass}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-bold text-[#444444] uppercase tracking-widest font-nunito">Location</FormLabel>
                        <FormControl>
                          <div className="px-4 py-3 rounded-[12px] bg-[#FAFAFA] text-[#333333] font-nunito font-semibold border-2 border-[#EEEEEE]" data-testid="text-location">
                            Bomb Rolls and Bowls
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-bold text-[#444444] uppercase tracking-widest font-nunito">Dine In / Take Out</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => field.onChange("dine_in")}
                              className={`flex-1 py-3 rounded-[12px] font-nunito font-bold text-[14px] transition-all duration-200 ${
                                field.value === "dine_in"
                                  ? "bg-[#8B0000] text-white"
                                  : "border-2 border-[#EEEEEE] text-[#333333] bg-white hover:border-[#8B0000]"
                              }`}
                              data-testid="button-dine-in"
                            >
                              🍽 Dine In
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange("take_out")}
                              className={`flex-1 py-3 rounded-[12px] font-nunito font-bold text-[14px] transition-all duration-200 ${
                                field.value === "take_out"
                                  ? "bg-[#8B0000] text-white"
                                  : "border-2 border-[#EEEEEE] text-[#333333] bg-white hover:border-[#8B0000]"
                              }`}
                              data-testid="button-take-out"
                            >
                              🥡 Take Out
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}

              {/* STEP 2: Star Ratings & Comments */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-[28px] font-bold text-[#8B0000] font-bangers mb-6">
                    Rate Us
                  </h2>

                  {/* All Rating Questions */}
                  <div className="space-y-0">
                    {ratingQuestions.map(({ key, label, icon }, idx) => (
                      <div key={key} className={idx < ratingQuestions.length - 1 ? "pb-4 border-b border-[#F0F0F0]" : "pb-4"}>
                        <FormField
                          control={form.control}
                          name={`ratings.${key}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[14px] font-bold text-[#333333] font-nunito flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                {label}
                              </FormLabel>
                              <FormControl>
                                <div className="flex gap-2 mt-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => field.onChange(star)}
                                      className="transition-all duration-200"
                                      data-testid={`star-${key}-${star}`}
                                    >
                                      <span
                                        className={`text-3xl transition-all ${
                                          star <= field.value ? "scale-125" : "scale-100 opacity-40"
                                        }`}
                                      >
                                        {star <= field.value ? "⭐" : "☆"}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Comments Section */}
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-bold text-[#444444] uppercase tracking-widest font-nunito">Comments (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us more about your experience..."
                            className="border-2 border-[#EEEEEE] bg-[#FAFAFA] rounded-[12px] font-nunito font-semibold text-[15px] text-[#333333] placeholder-[#BBBBBB] px-4 py-3 focus:border-[#FFD700] focus:outline-none focus:ring-4 focus:ring-yellow-300/20 transition-all resize-none"
                            maxLength={500}
                            rows={4}
                            {...field}
                            data-testid="input-comments"
                          />
                        </FormControl>
                        <p className="text-xs text-[#999999] text-right font-nunito">
                          {(field.value?.length || 0)}/500
                        </p>
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex-1 border-2 border-[#EEEEEE] text-[#333333] bg-white font-nunito font-bold rounded-[12px] hover:border-[#8B0000] transition-all duration-200"
                    data-testid="button-prev"
                  >
                    ← Back
                  </Button>
                )}

                {step < 2 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-[#8B0000] text-white font-nunito font-bold rounded-[12px] hover:bg-[#a51d1d] transition-all duration-200"
                    data-testid="button-next"
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#FFD700] to-[#FFC700] text-[#8B0000] font-nunito font-black rounded-[12px] hover:from-yellow-500 hover:to-yellow-400 transition-all duration-200"
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? "Submitting..." : "🚀 Submit"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
