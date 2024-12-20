import { supabase } from "@/integrations/supabase/client";
import type { ToastActionElement } from "@/components/ui/toast";

type Toast = {
  title?: string;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
};

interface MemberResponse {
  id: string;
  email: string;
  member_number: string;
  profile_updated: boolean;
  password_changed: boolean;
  full_name: string;
}

export const handleMemberIdLogin = async (
  memberId: string,
  password: string,
  toast: (props: Toast) => void
) => {
  try {
    console.log("Starting member ID login process for:", memberId);
    
    // Step 1: Check if member exists with retries
    const getMemberWithRetry = async (retries = 3): Promise<MemberResponse | null> => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Attempt ${i + 1} to fetch member ${memberId}`);
          
          // First try to get existing member
          const { data, error } = await supabase
            .from('members')
            .select('id, email, member_number, profile_updated, password_changed, full_name')
            .eq('member_number', memberId)
            .maybeSingle();
          
          if (!error && data) {
            console.log("Member found:", data);
            return data as MemberResponse;
          }
          
          if (error) {
            console.log(`Retry ${i + 1} failed:`, error);
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Retry ${i + 1} error:`, error);
          if (i === retries - 1) throw error;
        }
      }
      return null;
    };

    const existingMember = await getMemberWithRetry();
    let memberEmail;

    if (!existingMember) {
      console.error("No member found with ID:", memberId);
      throw new Error("Invalid Member ID");
    }

    // Step 2: Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', existingMember.id)  // Using id instead of member_id
      .maybeSingle();

    if (!existingProfile) {
      console.log("Profile not found, creating from member data");
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: existingMember.id,  // Using member's id as profile id
          email: existingMember.email,
          user_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error("Could not create profile");
      }
      
      memberEmail = existingMember.email;
      console.log("Profile created with email:", memberEmail);
    } else {
      memberEmail = existingProfile.email;
      console.log("Existing profile found:", memberEmail);
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Step 3: Try to sign in with profile credentials
    console.log("Attempting to sign in with email:", memberEmail);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password: existingMember.profile_updated ? password : memberId.toUpperCase(),
    });

    if (signInError) {
      console.log("Sign in failed:", signInError);
      throw new Error("Invalid Member ID or password");
    }

    console.log("Login successful for member:", memberId);
    return true;
  } catch (error) {
    console.error("Member ID login error:", error);
    toast({
      title: "Login failed",
      description: error instanceof Error ? error.message : "Invalid Member ID or password",
      variant: "destructive",
    });
    return false;
  }
};