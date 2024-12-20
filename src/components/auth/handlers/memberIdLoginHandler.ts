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
    
    // Step 1: Check if member exists in the members table using a transaction
    const { data: existingMember, error: checkError } = await supabase
      .from('members')
      .select('email, member_number, profile_updated, password_changed')
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
      
      try {
        // Try to insert the new member with a single query
        const { data: newMember, error: insertError } = await supabase
          .from('members')
          .insert({
            member_number: memberId,
            full_name: memberId,
            email: tempEmail,
            verified: true,
            profile_updated: false,
            password_changed: false,
            email_verified: true,
            status: 'active'
          })
          .select('email, profile_updated, password_changed')
          .single();

        if (insertError) {
          // If insert fails due to duplicate, try to fetch the existing record
          if (insertError.code === '23505') {
            console.log("Member was created in parallel, fetching existing record");
            const { data: existingMem, error: fetchError } = await supabase
              .from('members')
              .select('email, profile_updated, password_changed')
              .eq('member_number', memberId)
              .single();

            if (fetchError) {
              throw new Error("Failed to fetch member details");
            }
            memberEmail = existingMem.email;
          } else {
            throw insertError;
          }
        } else {
          memberEmail = newMember.email;
          console.log("New member created with email:", memberEmail);
        }
      } catch (error) {
        // One final attempt to get the member in case of race condition
        const { data: finalCheck } = await supabase
          .from('members')
          .select('email, profile_updated, password_changed')
          .eq('member_number', memberId)
          .single();

        if (finalCheck) {
          memberEmail = finalCheck.email;
        } else {
          console.error("Error in member creation process:", error);
          throw new Error("Failed to create or retrieve member account");
        }
      }
    } else {
      memberEmail = existingMember.email;
      console.log("Existing member found with email:", memberEmail);
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