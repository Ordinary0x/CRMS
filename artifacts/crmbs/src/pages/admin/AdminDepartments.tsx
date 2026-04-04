import { useState } from "react";
import { useAdminListDepartments, useAdminCreateDepartment, useAdminUpdateDepartment, getAdminListDepartmentsQueryKey, useAdminListUsers, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/shared/StateUI";
import { Plus, Edit, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDepartments() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [createHodId, setCreateHodId] = useState("none");
  const [editHodId, setEditHodId] = useState("none");
  const queryClient = useQueryClient();

  const { data: departments, isLoading } = useAdminListDepartments({
    query: { queryKey: getAdminListDepartmentsQueryKey() }
  });

  const { data: usersData } = useAdminListUsers(
    { role: 'hod', limit: 100 },
    { query: { queryKey: getAdminListUsersQueryKey({ role: 'hod', limit: 100 }) } }
  );

  const createDept = useAdminCreateDepartment();
  const updateDept = useAdminUpdateDepartment();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dept_name = formData.get("dept_name") as string;
    const building = formData.get("building") as string;
    const email = formData.get("email") as string;
    const hod_id = createHodId === "none" ? null : parseInt(createHodId, 10);

    try {
      await createDept.mutateAsync({
        data: { dept_name, building: building || null, email: email || null, hod_id }
      });
      toast.success("Department created successfully");
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: getAdminListDepartmentsQueryKey() });
    } catch (error) {
      toast.error("Failed to create department");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDept) return;

    const formData = new FormData(e.currentTarget);
    const dept_name = formData.get("dept_name") as string;
    const building = formData.get("building") as string;
    const email = formData.get("email") as string;
    const hod_id = editHodId === "none" ? null : parseInt(editHodId, 10);

    try {
      await updateDept.mutateAsync({
        id: editingDept.department_id,
        data: { dept_name, building: building || null, email: email || null, hod_id }
      });
      toast.success("Department updated successfully");
      setEditingDept(null);
      queryClient.invalidateQueries({ queryKey: getAdminListDepartmentsQueryKey() });
    } catch (error) {
      toast.error("Failed to update department");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Department Name *</Label>
                <Input name="dept_name" required />
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <Input name="building" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Head of Department</Label>
                <Select value={createHodId} onValueChange={setCreateHodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select HOD" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                    {usersData?.data.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createDept.isPending}>
                Create Department
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Head of Department</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments?.map((dept) => (
                  <TableRow key={dept.department_id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {dept.dept_name}
                    </TableCell>
                    <TableCell>{dept.building || '-'}</TableCell>
                    <TableCell>{dept.email || '-'}</TableCell>
                    <TableCell>{dept.hod_name || '-'}</TableCell>
                    <TableCell className="text-right">{dept.user_count}</TableCell>
                    <TableCell>
                      <Dialog
                        open={editingDept?.department_id === dept.department_id}
                        onOpenChange={(open) => {
                          if (open) {
                            setEditingDept(dept);
                            setEditHodId(dept.hod_id ? dept.hod_id.toString() : "none");
                          } else {
                            setEditingDept(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Department: {dept.dept_name}</DialogTitle>
                          </DialogHeader>
                          {editingDept && (
                            <form onSubmit={handleUpdate} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Department Name *</Label>
                                <Input name="dept_name" defaultValue={editingDept.dept_name} required />
                              </div>
                              <div className="space-y-2">
                                <Label>Building</Label>
                                <Input name="building" defaultValue={editingDept.building || ''} />
                              </div>
                              <div className="space-y-2">
                                <Label>Email</Label>
                                <Input name="email" type="email" defaultValue={editingDept.email || ''} />
                              </div>
                              <div className="space-y-2">
                                <Label>Head of Department</Label>
                                <Select value={editHodId} onValueChange={setEditHodId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select HOD" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {usersData?.data.map((user) => (
                                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                                        {user.first_name} {user.last_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button type="submit" className="w-full" disabled={updateDept.isPending}>
                                Save Changes
                              </Button>
                            </form>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {departments?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No departments found
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
