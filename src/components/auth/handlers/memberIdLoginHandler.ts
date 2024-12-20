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
      console.log("Member not found, starting creation process");
      const tempEmail = `${memberId.toLowerCase()}@temp.pwaburton.org`;
      
      // First check if member was created in the meantime
      const { data: doubleCheck } = await supabase
        .from('members')
        .select('email')
        .eq('member_number', memberId)
        .maybeSingle();

      if (doubleCheck?.email) {
        console.log("Member found in double check:", doubleCheck.email);
        memberEmail = doubleCheck.email;
      } else {
        // Try to create new member
        const { data: newMember, error: insertError } = await supabase
          .from('members')
          .insert({
            member_number: memberId,
            email: tempEmail,
            full_name: memberId,
            verified: true,
            profile_updated: false,
            password_changed: false,
            email_verified: true,
            status: 'active'
          })
          .select('email')
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          
          if (insertError.code === '23505') {
            // One final check in case of race condition
            const { data: finalCheck } = await supabase
              .from('members')
              .select('email')
              .eq('member_number', memberId)
              .single();
              
            if (finalCheck?.email) {
              memberEmail = finalCheck.email;
              console.log("Found member after conflict:", memberEmail);
            } else {
              throw new Error("Could not resolve member creation conflict");
            }
          } else {
            throw insertError;
          }
        } else if (newMember?.email) {
          memberEmail = newMember.email;
          console.log("New member created:", memberEmail);
        }
      }
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Step 3: Try to sign in
    console.log("Attempting to sign in with email:", memberEmail);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password: existingMember?.profile_updated ? password : memberId.toUpperCase(),
    });

    if (signInError) {
      console.log("Sign in failed, attempting signup:", signInError);
      
      // If sign in fails and profile is not updated, try to sign up
      if (!existingMember?.profile_updated) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: memberEmail,
          password: memberId.toUpperCase(),
          options: {
            data: {
              member_id: memberId,
              member_number: memberId.toUpperCase(),
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes("User already registered")) {
            console.error("Invalid credentials for existing user");
            throw new Error("Invalid Member ID or password");
          } else {
            console.error("Sign up error:", signUpError);
            throw signUpError;
          }
        }

        // Wait for auth to process
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error("Invalid password. Please use your updated password to login.");
      }
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