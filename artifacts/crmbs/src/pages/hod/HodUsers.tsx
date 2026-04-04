import { useHodListUsers, useHodActivateUser, getHodListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function HodUsers() {
  const [activatingUser, setActivatingUser] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useHodListUsers({
    query: { queryKey: getHodListUsersQueryKey() }
  });

  const activateUser = useHodActivateUser();

  const handleActivate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activatingUser) return;
    const formData = new FormData(e.currentTarget);
    const role = formData.get("role") as string;

    try {
      await activateUser.mutateAsync({
        id: activatingUser.user_id,
        data: { role }
      });
      toast.success("User activated successfully");
      setActivatingUser(null);
      queryClient.invalidateQueries({ queryKey: getHodListUsersQueryKey() });
    } catch (error) {
      toast.error("Failed to activate user");
    }
  };

  const pendingUsers = users?.filter(u => !u.is_active) || [];
  const activeUsers = users?.filter(u => u.is_active) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Department Users</h2>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50">
            <CardTitle className="text-amber-800 text-lg">Pending Activations ({pendingUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      <Dialog open={activatingUser?.user_id === user.user_id} onOpenChange={(open) => setActivatingUser(open ? user : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700">
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Activate User: {user.first_name} {user.last_name}</DialogTitle>
                          </DialogHeader>
                          {activatingUser && (
                            <form onSubmit={handleActivate} className="space-y-4 mt-2">
                              <div className="space-y-2">
                                <Label>Assign Role</Label>
                                <Select name="role" defaultValue={activatingUser.role}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="faculty">Faculty</SelectItem>
                                    <SelectItem value="resource_manager">Resource Manager</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Select the appropriate role for this user within your department.</p>
                              </div>
                              <Button type="submit" className="w-full" disabled={activateUser.isPending}>
                                Confirm Activation
                              </Button>
                            </form>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                    <TableCell><StatusBadge status="active" /></TableCell>
                  </TableRow>
                ))}
                {activeUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No active users in your department.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
