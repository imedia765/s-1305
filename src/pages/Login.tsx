import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const cleanIdentifier = identifier.trim().toUpperCase();
    console.log("Login attempt with:", { identifier: cleanIdentifier });

    try {
      // Check if input is an email or member ID
      const isEmail = cleanIdentifier.includes('@') && !cleanIdentifier.includes('@temp.pwaburton.org');
      
      if (isEmail) {
        // Check if member has updated their password
        const { data: member } = await supabase
          .from('members')
          .select('password_changed, email_verified')
          .eq('email', cleanIdentifier)
          .single();

        if (!member?.password_changed) {
          toast({
            title: "Password not updated",
            description: "Please use the 'First Time Login' button below if you haven't changed your password yet.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Regular email login
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanIdentifier,
          password: password,
        });

        if (error) throw error;

      } else {
        // Member ID login - first check if member exists
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('email, password_changed, member_number')
          .eq('member_number', cleanIdentifier)
          .single();

        if (memberError || !member) {
          throw new Error("Invalid Member ID. Please check your credentials.");
        }

        // For member ID login, use temporary email format
        const tempEmail = `${cleanIdentifier.toLowerCase()}@temp.pwaburton.org`;
        console.log("Attempting login with temp email:", tempEmail);

        const { error } = await supabase.auth.signInWithPassword({
          email: tempEmail,
          password: cleanIdentifier // For first time login, password is the same as member ID
        });

        if (error) {
          console.error("Login error:", error);
          if (error.message.includes('Invalid login credentials')) {
            throw new Error("Invalid Member ID or password. For first-time login, use your Member ID as both username and password.");
          }
          throw error;
        }
      }

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      navigate("/admin/profile");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials. Please check your email/member ID and password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstTimeLogin = () => {
    navigate('/first-time-login');
  };

  return (
    <div className="container max-w-lg mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <InfoIcon className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-blue-700">
              Enter your email if you've already updated your profile, or your Member ID if this is your first time logging in.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Email or Member ID"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                First time here?
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleFirstTimeLogin}
          >
            First Time Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}