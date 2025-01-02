import { Profile } from "@/integrations/supabase/types/profile";
import { format } from "date-fns";

interface ContactInformationProps {
  profile: Profile;
}

export const ContactInformation = ({ profile }: ContactInformationProps) => {
  return (
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
      {(profile.address || profile.town || profile.postcode) && (
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="font-medium">
            {[
              profile.address,
              profile.town,
              profile.postcode
            ].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
      )}
    </div>
  );
};