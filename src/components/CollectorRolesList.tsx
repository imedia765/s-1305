import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Database } from '@/integrations/supabase/types';
import { Loader2, AlertCircle, User, Shield, Clock } from "lucide-react";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useEnhancedRoleAccess } from "@/hooks/useEnhancedRoleAccess";
import { useRoleSync } from "@/hooks/useRoleSync";
import { useRoleStore } from "@/store/roleStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CollectorInfo {
  full_name: string;
  member_number: string;
  roles: string[];
  auth_user_id: string;
  role_details: {
    role: string;
    created_at: string;
  }[];
}

const CollectorRolesList = () => {
  const { toast } = useToast();
  const { userRole, userRoles, roleLoading, error: roleError, permissions } = useRoleAccess();
  const { userRoles: enhancedRoles, isLoading: enhancedLoading } = useEnhancedRoleAccess();
  const { syncStatus, syncRoles } = useRoleSync();
  const roleStore = useRoleStore();

  const { data: collectors, isLoading, error } = useQuery({
    queryKey: ['collectors-roles'],
    queryFn: async () => {
      console.log('Fetching collectors and roles data...');
      
      try {
        const { data: activeCollectors, error: collectorsError } = await supabase
          .from('members_collectors')
          .select('member_number, name')
          .eq('active', true);

        if (collectorsError) {
          console.error('Error fetching collectors:', collectorsError);
          throw collectorsError;
        }

        console.log('Active collectors:', activeCollectors);

        const collectorsWithRoles = await Promise.all(
          activeCollectors.map(async (collector) => {
            try {
              const { data: memberData, error: memberError } = await supabase
                .from('members')
                .select('full_name, member_number, auth_user_id')
                .eq('member_number', collector.member_number)
                .single();

              if (memberError) {
                console.error('Error fetching member data:', memberError);
                throw memberError;
              }

              const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('role, created_at')
                .eq('user_id', memberData.auth_user_id)
                .order('created_at', { ascending: true });

              if (rolesError) {
                console.error('Error fetching roles:', rolesError);
                throw rolesError;
              }

              return {
                full_name: memberData.full_name,
                member_number: memberData.member_number,
                auth_user_id: memberData.auth_user_id,
                roles: roles?.map(r => r.role) || [],
                role_details: roles?.map(r => ({
                  role: r.role,
                  created_at: r.created_at
                })) || []
              };
            } catch (err) {
              console.error('Error processing collector:', collector.member_number, err);
              toast({
                title: "Error loading collector data",
                description: `Could not load data for collector ${collector.member_number}`,
                variant: "destructive",
              });
              return null;
            }
          })
        );

        const validCollectors = collectorsWithRoles.filter(c => c !== null);
        console.log('Final collectors data:', validCollectors);
        return validCollectors;
      } catch (err) {
        console.error('Error in collector roles query:', err);
        toast({
          title: "Error loading collectors",
          description: "There was a problem loading the collectors list",
          variant: "destructive",
        });
        throw err;
      }
    }
  });

  if (error || roleError) {
    return (
      <div className="flex items-center justify-center p-4 text-red-500">
        <AlertCircle className="w-4 h-4 mr-2" />
        <span>Error loading collectors</span>
      </div>
    );
  }

  if (isLoading || roleLoading || enhancedLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[#F2FCE2]">Active Collectors and Roles</h2>
        <Badge variant="outline" className="text-[#D3E4FD]">
          {collectors?.length || 0} Collectors
        </Badge>
      </div>

      <Card className="p-4 bg-dashboard-card border-dashboard-cardBorder">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[#F3F3F3]">Collector</TableHead>
              <TableHead className="text-[#F3F3F3]">Member #</TableHead>
              <TableHead className="text-[#F3F3F3]">Roles</TableHead>
              <TableHead className="text-[#F3F3F3]">Last Updated</TableHead>
              <TableHead className="text-[#F3F3F3]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collectors?.map((collector) => (
              <TableRow key={collector.auth_user_id}>
                <TableCell className="flex items-center gap-2">
                  <User className="h-4 w-4 text-dashboard-accent1" />
                  <span className="text-[#F3F3F3]">{collector.full_name}</span>
                </TableCell>
                <TableCell className="text-[#D6BCFA]">
                  {collector.member_number}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {collector.roles.map((role, idx) => (
                      <Badge 
                        key={`${role}-${idx}`}
                        variant="outline"
                        className="bg-[#9B87F5]/10 text-[#D6BCFA] border-[#9B87F5]/20"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-[#F1F0FB] text-sm">
                  {collector.role_details.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(collector.role_details[collector.role_details.length - 1].created_at), 'PPp')}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className="bg-green-500/20 text-green-400 border-green-500/20"
                  >
                    Active
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CollectorRolesList;