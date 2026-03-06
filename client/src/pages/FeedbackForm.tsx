import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Star, Coffee, Utensils, Users, Sparkles, Heart } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertFeedbackSchema, type InsertFeedback } from "@shared/schema";

const categories = [
  { key: "qualityOfService", label: "How would you rate the quality of service?", icon: Coffee },
  { key: "speedOfService", label: "How satisfied were you with the speed of service?", icon: Sparkles },
  { key: "friendliness", label: "How would you rate the friendliness of our service?", icon: Users },
  { key: "foodTemperature", label: "How would you rate the temperature of the food on arrival?", icon: Utensils },
  { key: "menuExplanation", label: "How well were the menu and specials explained to you?", icon: Heart },
  { key: "likelyToReturn", label: "How likely are you to return based on the service?", icon: Coffee },
] as const;

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-1 focus:outline-none"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          data-testid={`star-${star}`}
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hover || value)
                ? "fill-[#F5A623] text-[#F5A623]"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function FeedbackForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertFeedback>({
    resolver: zodResolver(insertFeedbackSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      location: "Bomb Rolls and Bowls",
      diningOption: "dine-in",
      visitDate: new Date().toISOString().split('T')[0],
      visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      ratings: {
        qualityOfService: 0,
        speedOfService: 0,
        friendliness: 0,
        foodTemperature: 0,
        menuExplanation: 0,
        likelyToReturn: 0,
      },
      note: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertFeedback) => {
      const response = await apiRequest("POST", "/api/feedback", data);
      return response.json();
    },
    onSuccess: () => {
      navigate("/thank-you");
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

    // Automatically set current date and time
    const now = new Date();
    const automatedData = {
      ...data,
      visitDate: now.toISOString().split('T')[0],
      visitTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    };

    submitMutation.mutate(automatedData);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Logo className="w-32 h-32 mx-auto mb-4" />
          </motion.div>
          <h1 className="text-3xl font-bold text-[#8B1A1A]">Bomb Rolls and Bowls</h1>
          <p className="text-[#8B1A1A]/70 mt-2">We value your feedback</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#8B1A1A] font-playfair italic">Share Your Experience</CardTitle>
            <CardDescription>
              Help us serve you better by rating your visit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3b1a1a] font-poppins">Your Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your name"
                          {...field}
                          data-testid="input-name"
                          className="border-[#8B1A1A] focus-visible:ring-[#F5A623]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3b1a1a] font-poppins">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 234 567 8900"
                          {...field}
                          data-testid="input-phone"
                          className="border-[#8B1A1A] focus-visible:ring-[#F5A623]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#3b1a1a] font-poppins">Location You Visited:</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            readOnly
                            className="bg-muted cursor-not-allowed border-[#8B1A1A] focus-visible:ring-[#F5A623]"
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="diningOption"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-[#3b1a1a] font-poppins">Dine In / Take Out:</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="dine-in" className="border-[#8B1A1A] text-[#8B1A1A]" />
                              </FormControl>
                              <FormLabel className="font-normal text-[#5c3317]">Dine In</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="take-out" className="border-[#8B1A1A] text-[#8B1A1A]" />
                              </FormControl>
                              <FormLabel className="font-normal text-[#5c3317]">Take Out</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-playfair italic text-[#8B1A1A]">Rate Your Experience</Label>
                  {categories.map(({ key, label, icon: Icon }) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`ratings.${key}`}
                      render={({ field }) => (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * categories.indexOf({ key, label, icon: Icon } as any) }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-[#8B1A1A]" />
                            <span className="font-medium text-[#5c3317]">{label}</span>
                          </div>
                          <StarRating
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </motion.div>
                      )}
                    />
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#3b1a1a] font-poppins">Additional Comments (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us more about your experience..."
                          className="resize-none border-[#8B1A1A] focus-visible:ring-[#F5A623]"
                          maxLength={500}
                          rows={4}
                          {...field}
                          data-testid="input-note"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground text-right">
                        {(field.value?.length || 0)}/500
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#8B1A1A] hover:bg-[#A52020] text-white font-poppins"
                  size="lg"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Thank you for dining with us
        </p>
      </motion.div>
    </div>
  );
}
