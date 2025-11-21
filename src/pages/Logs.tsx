import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

export default function Logs() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['audit_logs', isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const filteredLogs = logs.filter(log =>
    log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.table_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getModuleName = (tableName: string) => {
    const moduleMap: Record<string, string> = {
      'transactions': 'Sales',
      'transaction_items': 'Sales',
      'products': 'Inventory',
      'customers': 'Customers',
      'customer_files': 'Customers',
      'payment_plans': 'Collections',
      'collections': 'Collections',
      'expenses': 'Expenses',
      'files': 'Files',
      'folders': 'Files'
    };
    return moduleMap[tableName] || tableName;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'View all user activity' : 'View your activity history'}
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow 
                    key={log.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => {
                      setSelectedLog(log);
                      setDetailsOpen(true);
                    }}
                  >
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>{log.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        log.action === 'CREATE' ? 'default' :
                        log.action === 'UPDATE' ? 'secondary' :
                        log.action === 'DELETE' ? 'destructive' :
                        'outline'
                      }>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getModuleName(log.table_name)}</Badge>
                    </TableCell>
                    <TableCell>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Activity Log Details</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date & Time</p>
                    <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User</p>
                    <p className="text-sm">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Action</p>
                    <Badge variant={
                      selectedLog.action === 'CREATE' ? 'default' :
                      selectedLog.action === 'UPDATE' ? 'secondary' :
                      selectedLog.action === 'DELETE' ? 'destructive' :
                      'outline'
                    }>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Module</p>
                    <Badge variant="outline">{getModuleName(selectedLog.table_name)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Table</p>
                    <p className="text-sm font-mono">{selectedLog.table_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Record ID</p>
                    <p className="text-sm font-mono text-xs">{selectedLog.record_id || 'N/A'}</p>
                  </div>
                </div>
                
                {selectedLog.old_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Old Data</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.new_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">New Data</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
