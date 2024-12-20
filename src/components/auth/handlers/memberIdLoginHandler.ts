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
    console.log("Starting member ID login process for:", memberId);
    
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
      console.log("Member not found, creating new member:", memberId);
      
      const tempEmail = `${memberId.toLowerCase()}@temp.pwaburton.org`;
      
      // Use a transaction to ensure atomicity
      const { data: newMember, error: createError } = await supabase
        .rpc('create_member_with_retry', {
          p_member_number: memberId,
          p_full_name: memberId,
          p_email: tempEmail,
          max_retries: 3
        });

      if (createError) {
        console.error("Error creating member:", createError);
        throw new Error("Failed to create member account");
      }

      memberEmail = tempEmail;
      console.log("New member created with email:", memberEmail);
    } else {
      memberEmail = existingMember.email;
      console.log("Existing member found with email:", memberEmail);
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Step 3: Check if auth user exists
    const { data: { user: existingUser }, error: userCheckError } = await supabase.auth.admin.getUserByEmail(memberEmail);
    
    if (userCheckError) {
      console.error("Error checking auth user:", userCheckError);
    }

    if (existingUser) {
      console.log("Auth user exists, attempting sign in");
      // Try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: memberEmail,
        password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        throw new Error("Invalid Member ID or password");
      }
    } else {
      console.log("Auth user does not exist, creating new user");
      // Create new auth user
      const { error: signUpError } = await supabase.auth.signUp({
        email: memberEmail,
        password,
        options: {
          data: {
            member_id: memberId,
            member_number: memberId.toUpperCase(),
          }
        }
      });

      if (signUpError) {
        // If user was created in a race condition, try signing in
        if (signUpError.message.includes("User already registered")) {
          console.log("User was created in parallel, attempting sign in");
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: memberEmail,
            password,
          });

          if (retryError) {
            console.error("Retry sign in error:", retryError);
            throw new Error("Invalid Member ID or password");
          }
        } else {
          console.error("Sign up error:", signUpError);
          throw signUpError;
        }
      }

      // Wait for auth to process
      await new Promise(resolve => setTimeout(resolve, 2000));
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