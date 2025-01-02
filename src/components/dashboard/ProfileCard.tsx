import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/integrations/supabase/types/profile";
import { format } from "date-fns";
import { BasicInformation } from "./profile/BasicInformation";
import { ContactInformation } from "./profile/ContactInformation";
import { FamilyInformation } from "./profile/FamilyInformation";
import { PaymentInformation } from "./profile/PaymentInformation";
import { StatusInformation } from "./profile/StatusInformation";

interface ProfileCardProps {
  profile: Profile | null;
  isLoading: boolean;
}

export const ProfileCard = ({ profile, isLoading }: ProfileCardProps) => {
  console.log("ProfileCard rendering with:", { profile, isLoading });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No profile data found</p>
          <p className="text-sm text-muted-foreground">Please check your profile settings or contact support.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <BasicInformation profile={profile} />

        <ContactInformation profile={profile} />

        <FamilyInformation profile={profile} />

        <PaymentInformation profile={profile} />

        <StatusInformation profile={profile} />

        {profile.admin_note && (
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground">Admin Notes</p>
            <p className="font-medium">{profile.admin_note}</p>
          </div>
        )}

        <div className="md:col-span-2 pt-4">
          <h3 className="text-lg font-semibold mb-4">System Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">{format(new Date(profile.created_at), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{format(new Date(profile.updated_at), 'PPP')}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};