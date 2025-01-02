import { Profile } from "@/integrations/supabase/types/profile";
import { format } from "date-fns";

interface FamilyInformationProps {
  profile: Profile;
}

export const FamilyInformation = ({ profile }: FamilyInformationProps) => {
  if (!profile.family_member_name) return null;

  return (
    <>
      <div className="md:col-span-2 pt-4">
        <h3 className="text-lg font-semibold mb-4">Family Member Details</h3>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Name</p>
        <p className="font-medium">{profile.family_member_name}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Relationship</p>
        <p className="font-medium capitalize">{profile.family_member_relationship || '—'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Date of Birth</p>
        <p className="font-medium">
          {profile.family_member_dob ? format(new Date(profile.family_member_dob), 'PPP') : '—'}
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Gender</p>
        <p className="font-medium capitalize">{profile.family_member_gender || '—'}</p>
      </div>
    </>
  );
};