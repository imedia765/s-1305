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

      // If member doesn't exist, create one
      if (!member) {
        console.log("Member not found, creating new member:", memberId);
        const { data: newMember, error: createError } = await supabase
          .from('members')
          .insert([
            {
              member_number: memberId,
              full_name: memberId, // Temporary name, will be updated in profile
              email: `${memberId.toLowerCase()}@temp.pwaburton.org`,
              verified: false,
              profile_updated: false
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error("Error creating member:", createError);
          throw new Error("Error creating new member account");
        }

        console.log("New member created successfully:", newMember);
      }

      // Get the latest member data (whether new or existing)
      const { data: updatedMember, error: fetchError } = await supabase
        .from('members')
        .select('email')
        .eq('member_number', memberId)
        .single();

      if (fetchError) {
        console.error("Error fetching member data:", fetchError);
        throw new Error("Error accessing member account");
      }

      const email = updatedMember.email || `${memberId.toLowerCase()}@temp.pwaburton.org`;

      // Attempt to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
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