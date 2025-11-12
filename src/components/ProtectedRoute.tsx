import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = localStorage.getItem('otp_session');
        
        if (!token) {
          console.log('No session token found');
          navigate('/otp-login');
          return;
        }

        // Server-side token validation
        const { data, error } = await supabase.functions.invoke('validate-session', {
          body: { token }
        });

        if (error) {
          console.error('Session validation error:', error);
          localStorage.removeItem('otp_session');
          toast({
            title: "Session Expired",
            description: "Please log in again.",
            variant: "destructive",
          });
          navigate('/otp-login');
          return;
        }

        if (!data?.valid) {
          console.log('Invalid session token');
          localStorage.removeItem('otp_session');
          toast({
            title: "Invalid Session",
            description: "Please log in again.",
            variant: "destructive",
          });
          navigate('/otp-login');
          return;
        }

        // Token is valid
        console.log('Session validated successfully');
        setIsAuthenticated(true);
      } catch (err: any) {
        console.error('Unexpected validation error:', err);
        localStorage.removeItem('otp_session');
        navigate('/otp-login');
      } finally {
        setIsValidating(false);
      }
    };

    validateSession();
  }, [navigate, toast]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
