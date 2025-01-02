import { Profile } from "@/integrations/supabase/types/profile";
import { format } from "date-fns";

interface ContactInformationProps {
  profile: Profile;
}

export const ContactInformation = ({ profile }: ContactInformationProps) => {
  console.log("ContactInformation rendering with address:", profile.address);
  
  return (
    <>
      <div className="md:col-span-2 pt-4">
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">Member Number</p>
          <p className="font-medium">{profile.member_number}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{profile.email || '—'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium">{profile.phone || '—'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Date of Birth</p>
          <p className="font-medium">
            {profile.date_of_birth ? format(new Date(profile.date_of_birth), 'PPP') : '—'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Gender</p>
          <p className="font-medium capitalize">{profile.gender || '—'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Marital Status</p>
          <p className="font-medium capitalize">{profile.marital_status || '—'}</p>
        </div>
      </div>
      <div className="md:col-span-2 mt-4">
        <p className="text-sm text-muted-foreground">Address</p>
        <div className="space-y-1">
          {profile.address && <p className="font-medium">{profile.address}</p>}
          <p className="font-medium">
            {[profile.town, profile.postcode].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
      </div>
    </>
  );
};