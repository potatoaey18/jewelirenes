import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Search, Users, UserCheck, UserX } from "lucide-react";
import { useConfirmation } from "@/hooks/useConfirmation";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
}

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Log the approval
      const { error: logError } = await supabase
        .from('approval_logs')
        .insert({
          user_id: userId,
          admin_id: user.id,
          action: 'approved'
        });

      if (logError) throw logError;

      // Get user details for email
      const userProfile = profiles?.find(p => p.id === userId);
      if (userProfile) {
        // Send approval email
        await supabase.functions.invoke('notify-user-approval', {
          body: {
            userEmail: userProfile.email,
            userName: userProfile.full_name,
            action: 'approved'
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success("User approved successfully");
    },
    onError: (error) => {
      toast.error("Failed to approve user: " + error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Log the rejection
      const { error: logError } = await supabase
        .from('approval_logs')
        .insert({
          user_id: userId,
          admin_id: user.id,
          action: 'rejected',
          reason: reason
        });

      if (logError) throw logError;

      // Get user details for email
      const userProfile = profiles?.find(p => p.id === userId);
      if (userProfile) {
        // Send rejection email
        await supabase.functions.invoke('notify-user-approval', {
          body: {
            userEmail: userProfile.email,
            userName: userProfile.full_name,
            action: 'rejected',
            reason: reason
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setRejectDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason("");
      toast.success("User rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject user: " + error.message);
    }
  });

  const handleApprove = async (user: Profile) => {
    const confirmed = await confirm({
      title: "Approve User",
      description: `Are you sure you want to approve ${user.email}? They will gain full access to the platform.`,
      confirmLabel: "Approve",
      cancelLabel: "Cancel",
      actionType: "custom"
    });
    if (confirmed) {
      approveMutation.mutate(user.id);
    }
  };

  const handleRejectClick = (user: Profile) => {
    setSelectedUser(user);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedUser) {
      rejectMutation.mutate({ userId: selectedUser.id, reason: rejectionReason });
    }
  };

  const filteredProfiles = profiles?.filter(profile => {
    const matchesSearch = 
      profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || profile.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingCount = profiles?.filter(p => p.status === 'pending_approval').length || 0;
  const activeCount = profiles?.filter(p => p.status === 'active').length || 0;
  const rejectedCount = profiles?.filter(p => p.status === 'rejected').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user approvals and access</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                  <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rejectedCount}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "pending_approval" ? "default" : "outline"}
                  onClick={() => setStatusFilter("pending_approval")}
                  size="sm"
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  onClick={() => setStatusFilter("active")}
                  size="sm"
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  onClick={() => setStatusFilter("rejected")}
                  size="sm"
                >
                  Rejected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users
            </CardTitle>
            <CardDescription>
              Review and manage user access to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredProfiles?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles?.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(profile.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(profile.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {profile.status === 'pending_approval' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(profile)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectClick(profile)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {profile.status === 'rejected' && profile.rejection_reason && (
                          <p className="text-sm text-muted-foreground italic">
                            Reason: {profile.rejection_reason}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject User</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting {selectedUser?.email}. This will be included in the notification email.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default UserManagement;
