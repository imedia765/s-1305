export interface Profile {
  id: string;
  auth_user_id: string;
  member_number: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  town: string | null;
  status: string | null;
  membership_type: string | null;
  role?: string;
  created_at: string;
  updated_at: string;
  
  // Additional fields from members table
  email_verified?: boolean;
  profile_completed?: boolean;
  registration_completed?: boolean;
  first_time_login?: boolean;
  registration_status?: string;
  
  // Payment information
  payment_amount?: number;
  payment_type?: string;
  payment_date?: string;
  payment_notes?: string;
  
  // Family member information
  family_member_name?: string;
  family_member_relationship?: string;
  family_member_dob?: string;
  family_member_gender?: string;
  
  // Administrative fields
  admin_note?: string;
}