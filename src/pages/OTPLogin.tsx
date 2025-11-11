import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Smartphone, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function OTPLogin() {
  const [type, setType] = useState<'email' | 'sms'>('email');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateInput = (type: 'email' | 'sms', value: string): boolean => {
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    } else {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      return phoneRegex.test(value);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!validateInput(type, value)) {
      toast({
        title: "Invalid Input",
        description: type === 'email' 
          ? "Please enter a valid email address" 
          : "Please enter a valid phone number in E.164 format (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: { type, value },
      });

      if (error) throw error;

      setOtpSent(true);
      startCountdown();
      toast({
        title: "OTP Sent",
        description: `A 6-digit code has been sent to your ${type === 'email' ? 'email' : 'phone'}`,
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit OTP code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { type, value, code },
      });

      if (error) throw error;

      if (data?.token) {
        // Store session token
        localStorage.setItem('otp_session', data.token);
        
        toast({
          title: "Success",
          description: "OTP verified successfully!",
        });

        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      let errorMessage = "Failed to verify OTP";
      if (error.message?.includes('expired')) {
        errorMessage = "OTP has expired. Please request a new one.";
      } else if (error.message?.includes('Invalid')) {
        errorMessage = "Invalid OTP code. Please check and try again.";
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    setCode('');
    setOtpSent(false);
    handleSendOTP();
  };

  const handleTabChange = (newType: string) => {
    setType(newType as 'email' | 'sms');
    setValue('');
    setCode('');
    setOtpSent(false);
    setCountdown(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <CardTitle className="text-2xl">OTP Login</CardTitle>
          <CardDescription>
            Enter your email or phone number to receive a one-time password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={type} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={otpSent}
                />
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={otpSent}
                />
                <p className="text-xs text-muted-foreground">
                  Use E.164 format (e.g., +1234567890)
                </p>
              </div>
            </TabsContent>

            {!otpSent ? (
              <Button 
                onClick={handleSendOTP} 
                disabled={isLoading || !value}
                className="w-full mt-4"
              >
                {isLoading ? "Sending..." : "Send OTP"}
              </Button>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter 6-Digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                <Button 
                  onClick={handleVerifyOTP} 
                  disabled={isLoading || code.length !== 6}
                  className="w-full"
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>

                <div className="text-center space-y-2">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend OTP in {countdown}s
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-sm"
                    >
                      Resend OTP
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
