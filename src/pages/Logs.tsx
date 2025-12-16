import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';

export default function Logs() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => 
    (localStorage.getItem("logs-view") as ViewMode) || "table"
  );

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

  const columns = [
    {
      key: 'created_at',
      label: 'Date & Time',
      render: (value: string) => new Date(value).toLocaleString()
    },
    {
      key: 'user_email',
      label: 'User'
    },
    {
      key: 'action',
      label: 'Action',
      render: (value: string) => (
        <Badge variant={
          value === 'CREATE' ? 'default' :
          value === 'UPDATE' ? 'secondary' :
          value === 'DELETE' ? 'destructive' :
          'outline'
        }>
          {value}
        </Badge>
      )
    },
    {
      key: 'table_name',
      label: 'Module',
      render: (value: string) => (
        <Badge variant="outline">{getModuleName(value)}</Badge>
      )
    },
    {
      key: 'id',
      label: 'Details',
      render: () => <FileText className="h-4 w-4 text-muted-foreground" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Activity Logs</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isAdmin ? 'View all user activity' : 'View your activity history'}
            </p>
          </div>
          <ViewToggle 
            viewMode={viewMode} 
            onViewModeChange={(mode) => {
              setViewMode(mode);
              localStorage.setItem("logs-view", mode);
            }} 
          />
        </div>

        <Card className="p-3 sm:p-6">
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

          {viewMode === "cards" ? (
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No logs found</p>
              ) : (
                filteredLogs.map((log) => (
                  <Card 
                    key={log.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedLog(log);
                      setDetailsOpen(true);
                    }}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={
                          log.action === 'CREATE' ? 'default' :
                          log.action === 'UPDATE' ? 'secondary' :
                          log.action === 'DELETE' ? 'destructive' : 'outline'
                        } className="text-[10px]">
                          {log.action}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{getModuleName(log.table_name)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{log.user_email}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <ResponsiveTable
              columns={columns}
              data={filteredLogs}
              onRowClick={(log) => {
                setSelectedLog(log);
                setDetailsOpen(true);
              }}
              emptyMessage="No logs found"
            />
          )}
        </Card>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Log Details</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-6 text-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Action</p>
                    <Badge className="mt-1 text-sm" variant={
                      selectedLog.action === 'CREATE' ? 'default' :
                      selectedLog.action === 'UPDATE' ? 'secondary' :
                      selectedLog.action === 'DELETE' ? 'destructive' :
                      'outline'
                    }>
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Module</p>
                    <Badge className="mt-1 text-sm" variant="outline">{getModuleName(selectedLog.table_name)}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">User</p>
                    <p className="text-muted-foreground mt-1">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Time</p>
                    <p className="text-muted-foreground mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                </div>
                
                {selectedLog.old_data && (
                  <div>
                    <p className="text-base font-semibold mb-3">Previous Data</p>
                    <div className="space-y-2 p-4 bg-muted rounded-lg">
                      {Object.entries(selectedLog.old_data).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="font-medium text-sm min-w-[140px]">{key}:</span>
                          <span className="text-muted-foreground break-all text-sm">
                            {key === 'product_names' || key === 'item_name' || key === 'product_name' 
                              ? String(value) 
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedLog.new_data && (
                  <div>
                    <p className="text-base font-semibold mb-3">New Data</p>
                    <div className="space-y-2 p-4 bg-muted rounded-lg">
                      {Object.entries(selectedLog.new_data).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="font-medium text-sm min-w-[140px]">{key}:</span>
                          <span className="text-muted-foreground break-all text-sm">
                            {key === 'product_names' || key === 'item_name' || key === 'product_name' 
                              ? String(value) 
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
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
