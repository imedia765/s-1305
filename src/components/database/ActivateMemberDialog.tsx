import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CollectorSelect } from "@/components/collectors/CollectorSelect";

interface ActivateMemberDialogProps {
  member: {
    id: string;
    full_name: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ActivateMemberDialog({
  member,
  isOpen,
  onClose,
  onUpdate
}: ActivateMemberDialogProps) {
  const [selectedCollectorId, setSelectedCollectorId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch active collectors
  const { data: collectors } = useQuery({
    queryKey: ['collectors'],
    queryFn: async () => {
      console.log('Fetching active collectors...');
      const { data, error } = await supabase
        .from('collectors')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching collectors:', error);
        throw error;
      }
      console.log('Fetched collectors:', data);
      return data;
    }
  });

  const handleActivate = async () => {
    if (!selectedCollectorId) {
      toast({
        title: "Collector Required",
        description: "Please select a collector before activating the member",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log('Activating member:', member.id, 'with collector:', selectedCollectorId);

    try {
      // Get collector details
      const { data: collector, error: collectorError } = await supabase
        .from('collectors')
        .select('name')
        .eq('id', selectedCollectorId)
        .single();

      if (collectorError || !collector) {
        throw new Error('Selected collector not found');
      }

      // Update member with collector and status
      const { error: updateError } = await supabase
        .from('members')
        .update({ 
          collector_id: selectedCollectorId,
          collector: collector.name,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);

      if (updateError) {
        console.error('Error updating member:', updateError);
        throw updateError;
      }

      toast({
        title: "Member Activated",
        description: "Member has been successfully activated and assigned to collector"
      });
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error activating member:', error);
      toast({
        title: "Error",
        description: "Failed to activate member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate Member: {member.full_name}</DialogTitle>
          <DialogDescription>
            Member ID: {member.id}
            <br />
            Select a collector to activate this member. This will generate a member number and enable their account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Collector</label>
            <CollectorSelect
              collectors={collectors || []}
              currentCollectorId=""
              selectedCollectorId={selectedCollectorId}
              onCollectorChange={setSelectedCollectorId}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={isLoading}>
              {isLoading ? "Activating..." : "Activate Member"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}