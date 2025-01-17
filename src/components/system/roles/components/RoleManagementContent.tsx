import { useState } from 'react';
import RoleHistoryView from '../RoleHistoryView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleManagementList from '../RoleManagementList';

const RoleManagementContent = () => {
  const [selectedTab, setSelectedTab] = useState('users');

  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users">User Roles</TabsTrigger>
        <TabsTrigger value="history">Role History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <RoleManagementList />
      </TabsContent>
      
      <TabsContent value="history">
        <RoleHistoryView />
      </TabsContent>
    </Tabs>
  );
};

export default RoleManagementContent;