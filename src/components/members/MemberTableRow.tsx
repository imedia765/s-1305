import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { Member } from "./types";

interface MemberTableRowProps {
  member: Member;
  expandedMember: string | null;
  toggleMember: (id: string) => void;
  setActivatingMember: (member: Member | null) => void;
  editingNotes: string | null;
  setEditingNotes: (id: string | null) => void;
  onUpdate: () => void;
}

export function MemberTableRow({
  member,
  expandedMember,
  toggleMember,
  setActivatingMember,
  editingNotes,
  setEditingNotes,
  onUpdate
}: MemberTableRowProps) {
  const isExpanded = expandedMember === member.id;

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell>{member.member_number || 'Pending Assignment'}</TableCell>
        <TableCell>{member.full_name}</TableCell>
        <TableCell>{member.email || 'Not set'}</TableCell>
        <TableCell>
          <Badge 
            variant={member.password_changed ? "success" : "destructive"}
          >
            {member.password_changed ? 'Updated' : 'Not Updated'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge 
            variant={
              member.status === 'active' ? "success" : 
              member.status === 'suspended' ? "destructive" :
              "secondary"
            }
          >
            {!member.member_number ? 'Pending Assignment' : 
             member.status === 'pending' ? 'Pending Activation' :
             member.status || 'Unknown'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {(!member.member_number || member.status === 'pending') && (
              <Button
                size="sm"
                onClick={() => setActivatingMember(member)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Activate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleMember(member.id)}
            >
              {isExpanded ? "Less Info" : "More Info"}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <div className="p-4 bg-muted/50">
              <MemberCard
                member={member}
                expandedMember={expandedMember}
                editingNotes={editingNotes}
                toggleMember={toggleMember}
                setEditingNotes={setEditingNotes}
                onUpdate={onUpdate}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}