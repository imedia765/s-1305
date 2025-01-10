import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Repository {
  id: string;
  name: string;
  source_url: string;
  target_url?: string;
  branch: string;
  is_master: boolean;
  created_at?: string;
  created_by?: string;
  last_sync_at?: string;
  status?: string;
}

export const useGitOperations = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [showAddRepo, setShowAddRepo] = useState(false);

  const fetchRepositories = async () => {
    try {
      const { data, error } = await supabase
        .from('git_repositories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRepositories(data || []);
      if (data && data.length > 0 && !selectedRepo) {
        setSelectedRepo(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching repositories:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch repositories",
        variant: "destructive",
      });
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('git_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
    }
  };

  const handlePushToRepo = async () => {
    if (!selectedRepo) return;

    setIsProcessing(true);
    setCurrentOperation('Pushing to repository...');
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const { error } = await supabase.functions.invoke('git-sync', {
        body: { 
          operation: 'push',
          repositoryId: selectedRepo
        }
      });

      clearInterval(interval);
      setProgress(100);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Repository sync completed successfully",
      });
    } catch (error: any) {
      console.error('Push error:', error);
      toast({
        title: "Push Failed",
        description: error.message || "Failed to push to repository",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentOperation('');
      fetchLogs();
    }
  };

  useEffect(() => {
    fetchRepositories();
    fetchLogs();
  }, []);

  return {
    isProcessing,
    currentOperation,
    progress,
    logs,
    repositories,
    selectedRepo,
    showAddRepo,
    setShowAddRepo,
    setSelectedRepo,
    handlePushToRepo,
    fetchRepositories
  };
};