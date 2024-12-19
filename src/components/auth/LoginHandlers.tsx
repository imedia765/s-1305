import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const useLoginHandlers = (setIsLoggedIn: (value: boolean) => void) => {
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      console.log("Attempting email login for:", email);
      
      // First check if this is a valid member email
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, email_verified, profile_updated')
        .eq('email', email)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error("Member lookup error:", memberError);
        throw new Error("Error looking up member details");
      }

      if (!memberData) {
        console.error("No member found with email:", email);
        throw new Error("No member found with this email address. Please check your credentials or use the Member ID login if you haven't updated your profile yet.");
      }

      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        throw error;
      }

      console.log("Login successful:", data);

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Email login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      });
    }
  };

  const handleMemberIdSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const memberId = (formData.get("memberId") as string).toUpperCase().trim();
    const password = formData.get("memberPassword") as string;

    try {
      console.log("Attempting member ID login for:", memberId);
      
      // First, get the member details
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('email, default_password_hash')
        .eq('member_number', memberId)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error("Member lookup error:", memberError);
        throw new Error("Error looking up member details");
      }

      if (!member) {
        console.error("No member found with ID:", memberId);
        throw new Error("Invalid Member ID. Please check your credentials and try again.");
      }

      if (!member.email) {
        // Create a temporary email for first-time login
        const tempEmail = `${memberId.toLowerCase()}@temp.pwaburton.org`;
        console.log("Creating temporary email:", tempEmail);
        
        // Update member with temporary email
        const { error: updateError } = await supabase
          .from('members')
          .update({ email: tempEmail })
          .eq('member_number', memberId)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error("Error updating member with temp email:", updateError);
          throw new Error("Error setting up temporary email");
        }

        member.email = tempEmail;
      }

      // Attempt to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: member.email,
        password: password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        throw signInError;
      }

      console.log("Login successful for member:", memberId);

      toast({
        title: "Login successful",
        description: "Welcome! Please update your profile information.",
      });
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Member ID login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid Member ID or password",
        variant: "destructive",
      });
    }
  };

  return {
    handleEmailSubmit,
    handleMemberIdSubmit,
  };
};