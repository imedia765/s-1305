import { supabase } from "@/integrations/supabase/client";
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

    if (checkError) {
      console.error("Member lookup error:", checkError);
      throw new Error("Error looking up member details");
    }

    let memberEmail;

    // Step 2: Handle member creation or retrieval
    if (!existingMember) {
      console.log("Member not found, attempting to create:", memberId);
      
      const tempEmail = `${memberId.toLowerCase()}@temp.pwaburton.org`;
      
      // First try to get the member again to handle race conditions
      const { data: doubleCheck } = await supabase
        .from('members')
        .select('email')
        .eq('member_number', memberId)
        .maybeSingle();

      if (doubleCheck?.email) {
        console.log("Member was created in parallel, using existing record");
        memberEmail = doubleCheck.email;
      } else {
        // Try to insert the new member
        const { data: newMember, error: createError } = await supabase
          .from('members')
          .insert({
            member_number: memberId,
            full_name: memberId,
            email: tempEmail,
            verified: true,
            profile_updated: false,
            email_verified: true,
            status: 'active'
          })
          .select('email')
          .single();

        if (createError) {
          if (createError.code === '23505') { // Unique constraint violation
            console.log("Member was created in parallel, fetching existing record");
            const { data: existingMem, error: fetchError } = await supabase
              .from('members')
              .select('email')
              .eq('member_number', memberId)
              .single();

            if (fetchError) {
              throw new Error("Failed to fetch member details");
            }
            memberEmail = existingMem.email;
          } else {
            console.error("Error creating member:", createError);
            throw new Error("Failed to create member account");
          }
        } else {
          memberEmail = newMember.email;
          console.log("New member created with email:", memberEmail);
        }
      }
    } else {
      memberEmail = existingMember.email;
      console.log("Existing member found with email:", memberEmail);
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Step 3: Try to sign in first
    console.log("Attempting to sign in with email:", memberEmail);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password,
    });

    if (signInError) {
      console.log("Sign in failed, attempting signup:", signInError);
      // If sign in fails, try to sign up
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