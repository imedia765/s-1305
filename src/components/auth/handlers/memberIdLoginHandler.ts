import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_KEY } from "@/config/supabase";
import { type Toast } from "@/components/ui/use-toast";

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