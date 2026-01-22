import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Coffee, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { adminLoginSchema, type AdminLogin } from "@shared/schema";
import { useEffect } from "react";

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: authCheck } = useQuery({
    queryKey: ["/api/auth/check"],
  });

  useEffect(() => {
    if ((authCheck as any)?.authenticated) {
      navigate("/admin");
    }
  }, [authCheck, navigate]);

  const form = useForm<AdminLogin>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLogin) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      navigate("/admin");
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Coffee className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Bomb Rolls and Bowls</h1>
          <p className="text-muted-foreground">Admin Dashboard</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle>Staff Login</CardTitle>
            </div>
            <CardDescription>
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter username"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Default: admin / bomb123
        </p>
      </motion.div>
    </div>
  );
}
