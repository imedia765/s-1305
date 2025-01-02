import { Profile } from "@/integrations/supabase/types/profile";
import { Badge } from "@/components/ui/badge";

interface StatusInformationProps {
  profile: Profile;
}

export const StatusInformation = ({ profile }: StatusInformationProps) => {
  return (
    <>
      <div>
        <p className="text-sm text-muted-foreground">Registration Status</p>
        <p className="font-medium capitalize">{profile.registration_status || 'Pending'}</p>
      </div>

      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">Email Verified</p>
          <Badge variant={profile.email_verified ? "success" : "secondary"}>
            {profile.email_verified ? "Yes" : "No"}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Profile Completed</p>
          <Badge variant={profile.profile_completed ? "success" : "secondary"}>
            {profile.profile_completed ? "Yes" : "No"}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Registration Complete</p>
          <Badge variant={profile.registration_completed ? "success" : "secondary"}>
            {profile.registration_completed ? "Yes" : "No"}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">First Time Login</p>
          <Badge variant={!profile.first_time_login ? "success" : "secondary"}>
            {profile.first_time_login ? "Yes" : "No"}
          </Badge>
        </div>
      </div>
    </>
  );
};