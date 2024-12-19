import { supabase } from "@/integrations/supabase/client";

export const updateProfileAndEmail = async (
  formData: FormData,
  newPassword: string,
  oldEmail: string
) => {
  console.log("Starting profile and email update process");

  // First update auth user password if provided
  if (newPassword) {
    console.log("Updating password...");
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (passwordError) throw passwordError;
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    throw new Error("User session expired");
  }

  // Get the new email from form data
  const newEmail = String(formData.get('email') || '');
  
  // If email has changed, update it in auth
  if (newEmail !== oldEmail) {
    console.log("Updating email from", oldEmail, "to", newEmail);
    const { error: emailError } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (emailError) throw emailError;
  }

  // Update member profile data
  const updatedData = {
    full_name: String(formData.get('fullName') || ''),
    email: newEmail,
    phone: String(formData.get('phone') || ''),
    address: String(formData.get('address') || ''),
    town: String(formData.get('town') || ''),
    postcode: String(formData.get('postcode') || ''),
    date_of_birth: String(formData.get('dob') || ''),
    gender: String(formData.get('gender') || ''),
    marital_status: String(formData.get('maritalStatus') || ''),
    password_changed: true,
    profile_updated: true,
    first_time_login: false,
    profile_completed: true,
    email_verified: false // Will be verified through email verification process
  };

  // Update member record
  const { error: updateError } = await supabase
    .from('members')
    .update(updatedData)
    .eq('email', oldEmail);

  if (updateError) throw updateError;

  console.log("Profile update completed successfully");
  return { success: true };
};