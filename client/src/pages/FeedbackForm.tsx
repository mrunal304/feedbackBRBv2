import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertFeedbackSchema, type InsertFeedback } from "@shared/schema";

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
        qualityOfService: 0,
        speedOfService: 0,
        friendliness: 0,
        foodTemperature: 0,
        menuExplanation: 0,
        likelyToReturn: 0,
      },
      favouriteDish: "",
      visitAgain: undefined,
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
      if (error.message?.includes("already submitted")) {
        toast({
          title: "Already Submitted",
          description: "You have already submitted feedback today. Please try again tomorrow.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to submit feedback",
          variant: "destructive",
        });
      }
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
    } else if (step === 2) {
      const ratings = form.getValues("ratings");
      const hasAllRatings = Object.values(ratings).every((r) => r >= 1);
      if (hasAllRatings) {
        setStep(3);
      } else {
        toast({
          title: "Missing Ratings",
          description: "Please rate all categories before proceeding",
          variant: "destructive",
        });
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const ratingQuestions = [
    { key: "qualityOfService", label: "Quality of Service", icon: "⭐" },
    { key: "speedOfService", label: "Speed of Service", icon: "⚡" },
    { key: "friendliness", label: "Friendliness", icon: "😊" },
    { key: "foodTemperature", label: "Food Temperature", icon: "🔥" },
    { key: "menuExplanation", label: "Menu Explanation", icon: "📋" },
    { key: "likelyToReturn", label: "Likely to Return", icon: "💫" },
  ] as const;

  const dishOptions = [
    "Loaded Nachos",
    "Angara Salad",
    "Spring Rolls",
    "Bomb Bowl",
    "Cheese Rolls",
    "Other",
  ];

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
          <h1 className="text-4xl font-bold text-white font-sans" style={{ fontFamily: "Bangers, cursive" }}>
            BOMB ROLLS & BOWLS
          </h1>
          <p className="text-amber-200 mt-2">We value your feedback</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-300 to-yellow-400"
            initial={{ width: "33.33%" }}
            animate={{ width: step === 1 ? "33.33%" : step === 2 ? "66.66%" : "100%" }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex justify-between text-xs text-white/70 mb-6">
          <span className={step >= 1 ? "text-amber-300 font-bold" : ""}>Your Info</span>
          <span className={step >= 2 ? "text-amber-300 font-bold" : ""}>Rate Us</span>
          <span className={step >= 3 ? "text-amber-300 font-bold" : ""}>Final Thoughts</span>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
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
                  <h2 className="text-2xl font-bold text-[#8B0000] font-sans" style={{ fontFamily: "Bangers, cursive" }}>
                    Your Info
                  </h2>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-bold">Your Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your name"
                            {...field}
                            data-testid="input-name"
                            className="border-2 border-[#8B0000] rounded-lg"
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
                        <FormLabel className="text-gray-700 font-bold">Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 234 567 8900"
                            {...field}
                            data-testid="input-phone"
                            className="border-2 border-[#8B0000] rounded-lg"
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
                        <FormLabel className="text-gray-700 font-bold">Location</FormLabel>
                        <FormControl>
                          <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold" data-testid="text-location">
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
                        <FormLabel className="text-gray-700 font-bold">Dine In / Take Out</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => field.onChange("dine_in")}
                              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                field.value === "dine_in"
                                  ? "bg-[#8B0000] text-white"
                                  : "border-2 border-[#8B0000] text-[#8B0000]"
                              }`}
                              data-testid="button-dine-in"
                            >
                              🍽 Dine In
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange("take_out")}
                              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                field.value === "take_out"
                                  ? "bg-[#8B0000] text-white"
                                  : "border-2 border-[#8B0000] text-[#8B0000]"
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

              {/* STEP 2: Star Ratings */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-[#8B0000] font-sans" style={{ fontFamily: "Bangers, cursive" }}>
                    Rate Your Experience
                  </h2>

                  {ratingQuestions.map(({ key, label, icon }) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`ratings.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-bold">
                            {icon} {label}
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => field.onChange(star)}
                                  className="transition-all"
                                  data-testid={`star-${key}-${star}`}
                                >
                                  <span
                                    className={`text-3xl transition-all ${
                                      star <= field.value ? "scale-125" : "scale-100"
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
                  ))}
                </motion.div>
              )}

              {/* STEP 3: Final Thoughts */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-[#8B0000] font-sans" style={{ fontFamily: "Bangers, cursive" }}>
                    Final Thoughts
                  </h2>

                  <FormField
                    control={form.control}
                    name="favouriteDish"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-bold">Favorite Dish</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {dishOptions.map((dish) => (
                              <button
                                key={dish}
                                type="button"
                                onClick={() => field.onChange(field.value === dish ? "" : dish)}
                                className={`px-4 py-2 rounded-full font-bold transition-all ${
                                  field.value === dish
                                    ? "bg-[#8B0000] text-white"
                                    : "border-2 border-[#8B0000] text-[#8B0000]"
                                }`}
                                data-testid={`chip-dish-${dish}`}
                              >
                                {dish}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="visitAgain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-bold">Will You Visit Again?</FormLabel>
                        <FormControl>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => field.onChange(true)}
                              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                field.value === true
                                  ? "bg-[#8B0000] text-white"
                                  : "border-2 border-[#8B0000] text-[#8B0000]"
                              }`}
                              data-testid="button-visit-yes"
                            >
                              🔥 Definitely!
                            </button>
                            <button
                              type="button"
                              onClick={() => field.onChange(false)}
                              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                                field.value === false
                                  ? "bg-[#8B0000] text-white"
                                  : "border-2 border-[#8B0000] text-[#8B0000]"
                              }`}
                              data-testid="button-visit-no"
                            >
                              😐 Maybe not
                            </button>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-bold">Comments (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us more about your experience..."
                            className="border-2 border-[#8B0000] rounded-lg resize-none"
                            maxLength={500}
                            rows={4}
                            {...field}
                            data-testid="input-comments"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 text-right">
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
                    variant="outline"
                    className="flex-1 border-2 border-[#8B0000] text-[#8B0000] font-bold rounded-lg"
                    data-testid="button-prev"
                  >
                    ← Back
                  </Button>
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 bg-gradient-to-r from-[#8B0000] to-[#C0001A] text-white font-bold rounded-lg"
                    data-testid="button-next"
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-amber-300 to-yellow-400 text-[#8B0000] font-bold rounded-lg"
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
