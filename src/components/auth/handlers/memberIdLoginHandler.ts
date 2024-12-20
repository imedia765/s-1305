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
      
      // First check if member was created in parallel
      const { data: parallelCheck, error: parallelError } = await supabase
        .from('members')
        .select('email, profile_updated, password_changed')
        .eq('member_number', memberId)
        .maybeSingle();

      if (parallelError) {
        console.error("Parallel check error:", parallelError);
      }

      if (parallelCheck?.email) {
        console.log("Member exists from parallel creation:", parallelCheck);
        memberEmail = parallelCheck.email;
      } else {
        try {
          // Attempt to create new member
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
            .maybeSingle();

          if (insertError) {
            if (insertError.code === '23505') {
              // Handle race condition - try one final time to get the member
              console.log("Duplicate key detected, attempting final fetch");
              const { data: finalCheck, error: finalError } = await supabase
                .from('members')
                .select('email, profile_updated, password_changed')
                .eq('member_number', memberId)
                .maybeSingle();

              if (finalError) {
                throw finalError;
              }

              if (finalCheck) {
                memberEmail = finalCheck.email;
              } else {
                throw new Error("Could not create or find member account");
              }
            } else {
              throw insertError;
            }
          } else if (newMember) {
            memberEmail = newMember.email;
            console.log("New member created with email:", memberEmail);
          } else {
            throw new Error("Failed to create member account");
          }
        } catch (error) {
          console.error("Member creation error:", error);
          throw error;
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