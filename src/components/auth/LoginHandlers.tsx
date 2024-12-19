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
      
      // First, check if member exists by member_number
      const { data: existingMember, error: checkError } = await supabase
        .from('members')
        .select('email, member_number')
        .eq('member_number', memberId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Member lookup error:", checkError);
        throw new Error("Error looking up member details");
      }

      let memberEmail;

      if (!existingMember) {
        console.log("Member not found, attempting to create:", memberId);
        
        try {
          const { data: newMember, error: createError } = await supabase
            .from('members')
            .insert({
              member_number: memberId,
              full_name: memberId, // Temporary name, will be updated in profile
              email: `${memberId.toLowerCase()}@temp.pwaburton.org`,
              verified: false,
              profile_updated: false
            })
            .select('email')
            .single();

          if (createError) {
            // If we get a duplicate key error, try to fetch the member again
            if (createError.code === '23505') {
              console.log("Member was created by another process, fetching details");
              const { data: racedMember, error: raceFetchError } = await supabase
                .from('members')
                .select('email')
                .eq('member_number', memberId)
                .single();

              if (raceFetchError) {
                console.error("Error fetching member after race condition:", raceFetchError);
                throw new Error("Error accessing member account");
              }

              memberEmail = racedMember.email;
            } else {
              console.error("Error creating member:", createError);
              throw new Error("Error creating new member account");
            }
          } else {
            console.log("New member created successfully:", newMember);
            memberEmail = newMember.email;
          }
        } catch (createError) {
          console.error("Member creation failed:", createError);
          throw new Error("Failed to create member account");
        }
      } else {
        memberEmail = existingMember.email || `${memberId.toLowerCase()}@temp.pwaburton.org`;
      }

      // Attempt to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: memberEmail,
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