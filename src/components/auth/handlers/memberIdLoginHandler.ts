import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_KEY } from "@/config/supabase";
import type { ToastActionElement } from "@/components/ui/toast";

type Toast = {
  title?: string;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
  children?: React.ReactNode;
};

export const handleMemberIdLogin = async (
  memberId: string,
  password: string,
  toast: (props: Toast) => void
) => {
  try {
    console.log("Attempting member ID login for:", memberId);
    
    // Step 1: Check if member exists in the members table
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

    // Step 2: Create member record if it doesn't exist
    if (!existingMember) {
      console.log("Member not found, attempting to create:", memberId);
      
      const tempEmail = `${memberId.toLowerCase()}@temp.pwaburton.org`;
      
      const { data: newMember, error: createError } = await supabase
        .from('members')
        .insert({
          member_number: memberId,
          full_name: memberId,
          email: tempEmail,
          verified: true,
          profile_updated: false,
          email_verified: true
        })
        .select('email')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          // Handle race condition - fetch the member that was just created
          const { data: racedMember, error: raceFetchError } = await supabase
            .from('members')
            .select('email')
            .eq('member_number', memberId)
            .single();

          if (raceFetchError) {
            console.error("Error fetching member after race condition:", raceFetchError);
            throw new Error("Failed to retrieve member details");
          }

          memberEmail = racedMember.email;
        } else {
          console.error("Error creating member:", createError);
          throw new Error("Failed to create member account");
        }
      } else {
        memberEmail = newMember.email;
      }
    } else {
      memberEmail = existingMember.email;
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Step 3: Try to sign in first
    console.log("Attempting sign in for:", memberEmail);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password,
    });

    // If sign in fails, try to sign up
    if (signInError) {
      console.log("Sign in failed, attempting signup:", signInError.message);
      
      const { error: signUpError } = await supabase.auth.signUp({
        email: memberEmail,
        password: password,
        options: {
          data: {
            member_id: memberId,
            member_number: memberId.toUpperCase(),
          }
        }
      });

      if (signUpError) {
        // If user already exists, try signing in again
        if (signUpError.message.includes("User already registered")) {
          console.log("User exists, retrying sign in");
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: memberEmail,
            password,
          });

          if (retryError) {
            console.error("Retry sign in error:", retryError);
            throw new Error("Invalid Member ID or password. Please try again.");
          }
        } else {
          console.error("Signup error:", signUpError);
          throw signUpError;
        }
      }

      // Wait briefly for signup to process
      await new Promise(resolve => setTimeout(resolve, 1000));
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