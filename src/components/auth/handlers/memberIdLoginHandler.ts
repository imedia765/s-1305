import { supabase } from "@/integrations/supabase/client";
import type { ToastActionElement } from "@/components/ui/toast";

type Toast = {
  title?: string;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
};

interface MemberResponse {
  email: string;
  member_number: string;
  profile_updated: boolean;
  password_changed: boolean;
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
            .select('email, member_number, profile_updated, password_changed')
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

    if (existingMember) {
      memberEmail = existingMember.email;
      console.log("Existing member found:", memberEmail);
    } else {
      console.log("Member not found, updating profiles");
      const tempEmail = `${memberId.toLowerCase()}@temp.pwaburton.org`;
      
      // Update or create profile
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            member_number: memberId,
            email: tempEmail,
            full_name: memberId,
            password: password,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'active'
          },
          {
            onConflict: 'member_number',
            ignoreDuplicates: false
          }
        )
        .select('email')
        .single();

      if (profileError) {
        console.error("Profile upsert error:", profileError);
        throw new Error("Could not update profile");
      }

      if (profileResult?.email) {
        memberEmail = profileResult.email;
        console.log("Profile updated:", memberEmail);
        
        // Also update members table
        const { error: memberError } = await supabase
          .from('members')
          .upsert({
            member_number: memberId,
            email: memberEmail,
            full_name: memberId,
            verified: true,
            profile_updated: false,
            password_changed: false,
            email_verified: true,
            status: 'active'
          });

        if (memberError) {
          console.error("Member update error:", memberError);
          throw new Error("Could not update member record");
        }
      }
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Step 3: Try to sign in with profile credentials
    console.log("Attempting to sign in with email:", memberEmail);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password: existingMember?.profile_updated ? password : memberId.toUpperCase(),
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