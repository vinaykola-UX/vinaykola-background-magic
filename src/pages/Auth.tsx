import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Sparkles, Shield, Zap } from "lucide-react";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      } else {
        setIsChecking(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        toast({
          title: "Welcome!",
          description: "You have successfully logged in.",
        });
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleGoogleLogin = async () => {
    toast({
      title: "Service Temporarily Unavailable",
      description: "Due to some issues we will solve this as early as possible. Thank you for visiting our website.",
      variant: "destructive",
    });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">PhotoEnhancer</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered image enhancement and background removal
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in with your Google account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              <Chrome className="mr-2 h-5 w-5" />
              {loading ? "Connecting to Google..." : "Continue with Google"}
            </Button>

            {/* Benefits Section */}
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-semibold text-center">What you'll get:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">5 free credits to enhance images</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">AI-powered background removal</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Secure and private processing</span>
                </div>
              </div>
            </div>

            {/* Credits Info */}
            <div className="bg-accent/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">Credits System</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  1 credit per image enhancement
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Background removal is free
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
