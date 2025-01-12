import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatabaseEnums } from "@/integrations/supabase/types/enums";
import { Settings, Database, Shield, GitBranch, Activity, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";
import RolesSection from "./RolesSection";
import RoutesSection from "./RoutesSection";
import DatabaseAccessSection from "./DatabaseAccessSection";
import PermissionsSection from "./PermissionsSection";
import DebugConsole from "./DebugConsole";
import { useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRunDiagnostics}
            disabled={isLoading}
            className="text-dashboard-text hover:text-white"
          >
            {isLoading ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-dashboard-text hover:text-white"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {userDiagnostics && (
        <ScrollArea className={`${isExpanded ? 'h-[80vh]' : 'h-[400px]'} transition-all duration-300`}>
          <div className="space-y-6">
            <div className="rounded-md border border-dashboard-cardBorder bg-dashboard-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-dashboard-cardBorder">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="text-dashboard-accent1">Function</TableHead>
                    <TableHead className="text-dashboard-accent1">Description</TableHead>
                    <TableHead className="text-dashboard-accent1">Type</TableHead>
                    <TableHead className="text-dashboard-accent1">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnosticFunctions.map((func, index) => (
                    <TableRow key={index} className="border-dashboard-cardBorder">
                      <TableCell className="text-dashboard-text">{func.icon}</TableCell>
                      <TableCell className="font-medium text-white">{func.name}</TableCell>
                      <TableCell className="text-dashboard-text">{func.description}</TableCell>
                      <TableCell className="text-dashboard-text">{func.type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          func.status === 'Active' 
                            ? 'bg-dashboard-success/20 text-dashboard-success' 
                            : 'bg-dashboard-warning/20 text-dashboard-warning'
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