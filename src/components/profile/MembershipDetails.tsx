import { Member } from "@/types/member";
import RoleBadge from "./RoleBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface MembershipDetailsProps {
  memberProfile: Member;
  userRole: string | null;
}

type AppRole = 'admin' | 'collector' | 'member';

const MembershipDetails = ({ memberProfile, userRole }: MembershipDetailsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the actual role from user_roles table
  const { data: actualRole } = useQuery({
    queryKey: ['actualUserRole', memberProfile.auth_user_id],
    queryFn: async () => {
      if (!memberProfile.auth_user_id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', memberProfile.auth_user_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching actual role:', error);
        return null;
      }

      // If no role found in user_roles, check if user is a collector
      if (!data?.role) {
        const { data: collectorData } = await supabase
          .from('members_collectors')
          .select('name')
          .eq('member_profile_id', memberProfile.id)
          .maybeSingle();

        if (collectorData) {
          return 'collector';
        }
      }

      return data?.role || 'member';
    },
    enabled: !!memberProfile.auth_user_id
  });

  // Use the actual role from the database if available, otherwise fall back to the passed userRole
  const displayRole = actualRole || userRole;
  const isAdmin = displayRole === 'admin';

  const handleRoleChange = async (newRole: AppRole) => {
    if (!memberProfile.auth_user_id) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, delete existing role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberProfile.auth_user_id);

      if (deleteError) throw deleteError;

      // Then insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: memberProfile.auth_user_id,
          role: newRole
        });

      if (insertError) throw insertError;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['actualUserRole'] });

      toast({
        title: "Success",
        description: `Role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-dashboard-muted text-sm">Membership Details</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-dashboard-text flex items-center gap-2">
            Status:{' '}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              memberProfile?.status === 'active' 
                ? 'bg-dashboard-accent3/20 text-dashboard-accent3' 
                : 'bg-dashboard-muted/20 text-dashboard-muted'
            }`}>
              {memberProfile?.status || 'Pending'}
              {memberProfile?.status === 'active' && (
                <CheckCircle2 className="w-4 h-4 ml-1 text-dashboard-accent3" />
              )}
            </span>
          </div>
          {isAdmin && (
            <span className="bg-dashboard-accent1/20 text-dashboard-accent1 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          )}
        </div>
        <div className="text-dashboard-text flex items-center gap-2">
          <span className="text-dashboard-accent2">Type:</span>
          <span className="flex items-center gap-2">
            {memberProfile?.membership_type || 'Standard'}
            {displayRole === 'admin' ? (
              <div className="ml-2">
                <Select onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-[140px] h-8 bg-dashboard-accent1/10 border-dashboard-accent1/20">
                    <SelectValue placeholder="Change Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="collector">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Collector
                      </div>
                    </SelectItem>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Member
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <RoleBadge role={displayRole} />
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MembershipDetails;