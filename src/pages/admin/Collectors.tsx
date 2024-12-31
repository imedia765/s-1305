import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { EditCollectorDialog } from "@/components/collectors/EditCollectorDialog";
import { CollectorList } from "@/components/collectors/CollectorList";
import { CollectorHeader } from "@/components/collectors/CollectorHeader";
import { CollectorSearch } from "@/components/collectors/CollectorSearch";
import { PrintTemplate } from "@/components/collectors/PrintTemplate";

export default function Collectors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCollector, setExpandedCollector] = useState<string | null>(null);
  const [editingCollector, setEditingCollector] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const { data: collectors, isLoading, refetch } = useQuery({
    queryKey: ['collectors'],
    queryFn: async () => {
      console.log('Starting collectors fetch process...');
      
      // First, get all collectors
      const { data: collectorsData, error: collectorsError } = await supabase
        .from('collectors')
        .select('*')
        .order('name');

      if (collectorsError) {
        console.error('Error fetching collectors:', collectorsError);
        throw collectorsError;
      }

      console.log('Fetched collectors:', collectorsData?.length);

      // Then, get all members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('full_name');

      if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
      }

      console.log('Fetched total members:', membersData?.length);

      // Helper function to normalize collector names for comparison
      const normalizeCollectorName = (name: string) => {
        if (!name) return '';
        return name.toLowerCase()
          .replace(/[\/&,.-]/g, '') // Remove special characters
          .replace(/\s+/g, '')      // Remove all whitespace
          .trim();
      };

      // Map members to their collectors using normalized name matching
      const enhancedCollectorsData = collectorsData.map(collector => {
        const collectorMembers = membersData.filter(member => {
          if (!member.collector) {
            console.log(`Member ${member.full_name} has no collector assigned`);
            return false;
          }
          
          const normalizedCollectorName = normalizeCollectorName(collector.name);
          const normalizedMemberCollector = normalizeCollectorName(member.collector);
          
          const isMatch = normalizedCollectorName === normalizedMemberCollector;
          
          if (!isMatch && normalizedMemberCollector.includes(normalizedCollectorName)) {
            console.log(`Potential partial match - Collector: ${collector.name}, Member's collector: ${member.collector}`);
          }
          
          return isMatch;
        });

        console.log(`Collector ${collector.name} has ${collectorMembers.length} members`);

        return {
          ...collector,
          members: collectorMembers
        };
      });

      // Log any members that weren't matched to any collector
      const unmatchedMembers = membersData.filter(member => {
        return !collectorsData.some(collector => 
          normalizeCollectorName(collector.name) === normalizeCollectorName(member.collector || '')
        );
      });

      if (unmatchedMembers.length > 0) {
        console.log('Unmatched members:', unmatchedMembers.map(m => ({
          name: m.full_name,
          collector: m.collector
        })));
      }

      return enhancedCollectorsData;
    }
  });

  const handlePrintAll = () => {
    const printContent = PrintTemplate({ collectors });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <CollectorHeader 
        onPrintAll={handlePrintAll}
        onUpdate={refetch}
      />

      <CollectorSearch 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <CollectorList
        collectors={collectors || []}
        expandedCollector={expandedCollector}
        onToggleCollector={setExpandedCollector}
        onEditCollector={setEditingCollector}
        onUpdate={refetch}
        isLoading={isLoading}
        searchTerm={searchTerm}
      />

      {editingCollector && (
        <EditCollectorDialog
          isOpen={true}
          onClose={() => setEditingCollector(null)}
          collector={editingCollector}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}