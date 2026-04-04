import { useState } from "react";
import { useAdminListUsers, useAdminUpdateUserRole, useAdminDeleteUser, getAdminListUsersQueryKey, useAdminListDepartments, getAdminListDepartmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, PriorityBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { format } from "date-fns";
import { Search, Edit, Trash2, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const queryClient = useQueryClient();

  const { data, isLoading } = useAdminListUsers(
    { page, limit: 10, search: search || undefined, role: roleFilter !== "all" ? roleFilter : undefined },
    { query: { queryKey: getAdminListUsersQueryKey({ page, limit: 10, search: search || undefined, role: roleFilter !== "all" ? roleFilter : undefined }) } }
  );

  const { data: departments } = useAdminListDepartments({
    query: { queryKey: getAdminListDepartmentsQueryKey() }
  });

  const updateRole = useAdminUpdateUserRole();
  const deleteUser = useAdminDeleteUser();

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const role = formData.get("role") as string;
    const department_id = formData.get("department_id") ? parseInt(formData.get("department_id") as string) : null;
    const is_active = formData.get("is_active") === "on";

    try {
      await updateRole.mutateAsync({
        id: editingUser.user_id,
        data: { role, department_id, is_active }
      });
      toast.success("User updated successfully");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await updateRole.mutateAsync({
        id: user.user_id,
        data: { role: user.role, is_active: !user.is_active }
      });
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Users Management</h2>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hod">Department Head</SelectItem>
                  <SelectItem value="resource_manager">Resource Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                      <TableCell>{user.department_name || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog open={editingUser?.user_id === user.user_id} onOpenChange={(open) => setEditingUser(open ? user : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User: {user.first_name} {user.last_name}</DialogTitle>
                              </DialogHeader>
                              {editingUser && (
                                <form onSubmit={handleUpdateUser} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select name="role" defaultValue={editingUser.role}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="hod">Department Head</SelectItem>
                                        <SelectItem value="resource_manager">Resource Manager</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="faculty">Faculty</SelectItem>
                                        <SelectItem value="student">Student</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select name="department_id" defaultValue={editingUser.department_id?.toString() || ""}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="None" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {departments?.map(d => (
                                          <SelectItem key={d.department_id} value={d.department_id.toString()}>
                                            {d.dept_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <Label>Active Status</Label>
                                    <Switch name="is_active" defaultChecked={editingUser.is_active} />
                                  </div>
                                  <Button type="submit" className="w-full" disabled={updateRole.isPending}>
                                    Save Changes
                                  </Button>
                                </form>
                              )}
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                {user.is_active ? <Ban className="h-4 w-4 text-amber-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{user.is_active ? 'Deactivate' : 'Activate'} User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to {user.is_active ? 'deactivate' : 'activate'} {user.first_name} {user.last_name}? 
                                  {user.is_active ? ' They will no longer be able to log in or book resources.' : ' They will regain access to the system.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleToggleActive(user)}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {data ? `Showing ${(page - 1) * 10 + 1} to ${Math.min(page * 10, data.total)} of ${data.total} users` : ''}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data || page * 10 >= data.total}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
