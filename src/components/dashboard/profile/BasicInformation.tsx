import { Profile } from "@/integrations/supabase/types/profile";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCog, User, UserCheck, Users } from "lucide-react";

interface BasicInformationProps {
  profile: Profile;
}

export const BasicInformation = ({ profile }: BasicInformationProps) => {
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('') || '??';

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin':
        return <UserCog className="h-4 w-4" />;
      case 'collector':
        return <UserCheck className="h-4 w-4" />;
      case 'member':
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'collector':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
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
            <Badge 
              variant={getRoleBadgeVariant(profile.role)} 
              className="capitalize flex gap-1 items-center"
            >
              {getRoleIcon(profile.role)}
              {profile.role}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};