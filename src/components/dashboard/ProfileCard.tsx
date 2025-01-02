import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/integrations/supabase/types/profile";
import { format } from "date-fns";

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

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('') || '??';

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold">{profile.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={profile.status === 'active' ? 'success' : 'secondary'}>
                {profile.status || 'Inactive'}
              </Badge>
              {profile.membership_type && (
                <Badge variant="outline" className="capitalize">
                  {profile.membership_type}
                </Badge>
              )}
              {profile.role && (
                <Badge variant="secondary" className="capitalize">
                  {profile.role}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Information Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Basic Information */}
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

          {/* Address Information */}
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

          {/* Family Member Information */}
          {profile.family_member_name && (
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
          )}

          {/* Payment Information */}
          {(profile.payment_amount || profile.payment_type || profile.payment_date) && (
            <>
              <div className="md:col-span-2 pt-4">
                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
              </div>
              {profile.payment_amount && (
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">£{profile.payment_amount}</p>
                </div>
              )}
              {profile.payment_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Type</p>
                  <p className="font-medium capitalize">{profile.payment_type}</p>
                </div>
              )}
              {profile.payment_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{format(new Date(profile.payment_date), 'PPP')}</p>
                </div>
              )}
              {profile.payment_notes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Payment Notes</p>
                  <p className="font-medium">{profile.payment_notes}</p>
                </div>
              )}
            </>
          )}

          {/* Registration Status */}
          <div>
            <p className="text-sm text-muted-foreground">Registration Status</p>
            <p className="font-medium capitalize">{profile.registration_status || 'Pending'}</p>
          </div>

          {/* Account Status Indicators */}
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

          {/* Admin Notes */}
          {profile.admin_note && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Admin Notes</p>
              <p className="font-medium">{profile.admin_note}</p>
            </div>
          )}

          {/* System Information */}
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
      </div>
    </Card>
  );
};