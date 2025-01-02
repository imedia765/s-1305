import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/integrations/supabase/types/profile";
import { useToast } from "@/components/ui/use-toast";

export const useProfile = () => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast({
          title: "Session Error",
          description: "Failed to get session. Please try logging in again.",
          variant: "destructive",
        });
        throw new Error("Failed to get session");
      }

      if (!session?.user) {
        console.log("No authenticated session found");
        throw new Error("No user found");
      }

      console.log("Fetching profile for user:", session.user.id);

      // Try to create profile from user metadata first
      if (session.user.user_metadata) {
        const { data: newProfile, error: createError } = await supabase
          .rpc('safely_upsert_profile', {
            p_auth_user_id: session.user.id,
            p_member_number: session.user.user_metadata.member_number || '',
            p_full_name: session.user.user_metadata.full_name || '',
            p_email: session.user.user_metadata.email || session.user.email || ''
          });

        if (createError) {
          console.error("Profile creation error:", createError);
        } else {
          console.log("Profile created/updated from metadata:", newProfile);
        }
      }

      // Now fetch the complete profile with role
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          auth_user_id,
          member_number,
          full_name,
          date_of_birth,
          gender,
          marital_status,
          email,
          phone,
          address,
          postcode,
          town,
          status,
          membership_type,
          created_at,
          updated_at
        `)
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        toast({
          title: "Error",
          description: "Failed to fetch profile data",
          variant: "destructive",
        });
        throw profileError;
      }

      // Fetch additional member details including address
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select(`
          email_verified,
          profile_completed,
          registration_completed,
          first_time_login,
          registration_status,
          payment_amount,
          payment_type,
          payment_date,
          payment_notes,
          family_member_name,
          family_member_relationship,
          family_member_dob,
          family_member_gender,
          admin_note,
          role,
          address,
          town,
          postcode
        `)
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Member fetch error:", memberError);
      }

      if (!profileData) {
        toast({
          title: "No Profile Found",
          description: "No profile data found for your account.",
          variant: "destructive",
        });
        return null;
      }

      // Combine profile and member data, prioritizing member table's address fields
      return {
        ...profileData,
        ...memberData,
        // Explicitly override address fields with member table data if available
        address: memberData?.address || profileData.address,
        town: memberData?.town || profileData.town,
        postcode: memberData?.postcode || profileData.postcode,
      } as Profile;
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });
};