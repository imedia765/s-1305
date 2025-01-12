import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatabaseEnums } from "@/integrations/supabase/types/enums";
import { Settings, Database, Shield, GitBranch, Activity, AlertTriangle } from "lucide-react";
import RolesSection from "./RolesSection";
import RoutesSection from "./RoutesSection";
import DatabaseAccessSection from "./DatabaseAccessSection";
import PermissionsSection from "./PermissionsSection";
import DebugConsole from "./DebugConsole";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserRole = DatabaseEnums['app_role'];

interface DiagnosticResult {
  roles: Array<{ role: UserRole }>;
  member: any | null;
  collector: any[];
  auditLogs: any[];
  payments: any[];
  accessibleTables: string[];
  permissions: {
    canManageRoles: boolean;
    canCollectPayments: boolean;
    canAccessAuditLogs: boolean;
    canManageMembers: boolean;
  };
  routes: {
    [key: string]: boolean;
  };
  timestamp: string;
}

interface DiagnosticsPanelProps {
  isLoading: boolean;
  userDiagnostics: DiagnosticResult | null;
  logs: string[];
  onRunDiagnostics: () => void;
}

const DiagnosticsPanel = ({ isLoading, userDiagnostics, logs, onRunDiagnostics }: DiagnosticsPanelProps) => {
  const diagnosticFunctions = [
    {
      name: "Database Access",
      icon: <Database className="w-4 h-4" />,
      description: "Checks database permissions and accessible tables",
      status: userDiagnostics?.accessibleTables.length ? "Active" : "Pending",
      type: "Core"
    },
    {
      name: "Role Management",
      icon: <Shield className="w-4 h-4" />,
      description: "Validates user roles and permissions",
      status: userDiagnostics?.roles.length ? "Active" : "Pending",
      type: "Security"
    },
    {
      name: "Git Operations",
      icon: <GitBranch className="w-4 h-4" />,
      description: "Monitors repository synchronization",
      status: "Active",
      type: "System"
    },
    {
      name: "Performance Monitoring",
      icon: <Activity className="w-4 h-4" />,
      description: "Tracks system performance metrics",
      status: "Active",
      type: "Monitoring"
    },
    {
      name: "Error Tracking",
      icon: <AlertTriangle className="w-4 h-4" />,
      description: "Monitors and logs system errors",
      status: logs.length ? "Active" : "Pending",
      type: "Monitoring"
    }
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-white">User Diagnostics</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={onRunDiagnostics}
          disabled={isLoading}
        >
          {isLoading ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {userDiagnostics && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-6">
            <div className="rounded-md border border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnosticFunctions.map((func, index) => (
                    <TableRow key={index}>
                      <TableCell>{func.icon}</TableCell>
                      <TableCell className="font-medium">{func.name}</TableCell>
                      <TableCell>{func.description}</TableCell>
                      <TableCell>{func.type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          func.status === 'Active' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {func.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <RolesSection roles={userDiagnostics.roles} />
            <RoutesSection routes={userDiagnostics.routes} />
            <DatabaseAccessSection tables={userDiagnostics.accessibleTables} />
            <PermissionsSection permissions={userDiagnostics.permissions} />
            <DebugConsole logs={logs} />
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default DiagnosticsPanel;