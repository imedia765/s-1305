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
      
      // Try to create the member, but handle potential race conditions
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data: newMember, error: createError } = await supabase
            .from('members')
            .insert({
              member_number: memberId,
              full_name: memberId,
              email: `${memberId.toLowerCase()}@temp.pwaburton.org`,
              verified: true,
              profile_updated: false,
              email_verified: true
            })
            .select('email')
            .single();

          if (createError) {
            if (createError.code === '23505') {
              // If we get a duplicate key error, try to fetch the member that was just created
              console.log("Member was created by another process, fetching details");
              const { data: racedMember, error: raceFetchError } = await supabase
                .from('members')
                .select('email')
                .eq('member_number', memberId)
                .single();

              if (raceFetchError) {
                console.error("Error fetching member after race condition:", raceFetchError);
                continue; // Try again if we couldn't fetch the member
              }

              memberEmail = racedMember.email;
              break; // Successfully got the member email, exit the loop
            } else {
              throw createError; // For any other error, throw it
            }
          } else {
            console.log("New member created successfully:", newMember);
            memberEmail = newMember.email;
            break; // Successfully created member, exit the loop
          }
        } catch (error) {
          if (attempt === 2) { // Last attempt
            console.error("All attempts to create/fetch member failed:", error);
            throw new Error("Failed to create member account");
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
    } else {
      memberEmail = existingMember.email || `${memberId.toLowerCase()}@temp.pwaburton.org`;
    }

    if (!memberEmail) {
      throw new Error("Could not determine member email");
    }

    // Try to create the auth user first
    try {
      console.log("Attempting to create auth user for:", memberEmail);
      const { data: authUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: memberEmail,
        password: password,
        email_confirm: true
      });

      if (createUserError && createUserError.message !== "User already registered") {
        console.error("Error creating auth user:", createUserError);
        throw createUserError;
      }
      console.log("Auth user created or already exists");
    } catch (error) {
      console.log("Error in auth user creation, attempting sign in anyway:", error);
    }

    // Now attempt to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password,
    });

    if (signInError) {
      console.error("Sign in error:", signInError);
      if (signInError.message === "Email not confirmed") {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/confirm-user-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ email: memberEmail })
        });

        if (!response.ok) {
          console.error("Error verifying email:", await response.text());
          throw new Error("Unable to verify email. Please contact support.");
        }

        const { error: retryError } = await supabase.auth.signInWithPassword({
          email: memberEmail,
          password,
        });
        if (retryError) {
          if (retryError.message.includes("Invalid login credentials")) {
            throw new Error("Invalid Member ID or password. Please try again.");
          }
          throw retryError;
        }
      } else if (signInError.message.includes("Invalid login credentials")) {
        throw new Error("Invalid Member ID or password. Please try again.");
      } else {
        throw signInError;
      }
    }

    console.log("Login successful for member:", memberId);
    return true;
  } catch (error) {
    console.error("Member ID login error:", error);
    toast({
      title: "Login failed",
      variant: "destructive",
      children: error instanceof Error ? error.message : "Invalid Member ID or password"
    });
    return false;
  }
};