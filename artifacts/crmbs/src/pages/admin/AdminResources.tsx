import { useMemo, useState } from "react";
import { customFetch, useListResources, getListResourcesQueryKey, useListResourceCategories, getListResourceCategoriesQueryKey, useAdminListUsers, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AdminResources() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [managerId, setManagerId] = useState("none");
  const [departmentId, setDepartmentId] = useState("none");
  const [approvalSteps, setApprovalSteps] = useState("inherit");
  const queryClient = useQueryClient();

  const { data: resources, isLoading } = useListResources(
    { search: search || undefined },
    { query: { queryKey: getListResourcesQueryKey({ search: search || undefined }) } }
  );

  const { data: categories } = useListResourceCategories({
    query: { queryKey: getListResourceCategoriesQueryKey() },
  });

  const adminUsersParams = useMemo(() => ({ page: 1, limit: 200, role: "resource_manager" }), []);
  const { data: managers } = useAdminListUsers(adminUsersParams, {
    query: { queryKey: getAdminListUsersQueryKey(adminUsersParams) },
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const resource_name = (formData.get("resource_name") as string)?.trim();
    const capacity = Number(formData.get("capacity"));
    const location = (formData.get("location") as string)?.trim();

    if (!resource_name || !capacity || !categoryId) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      await customFetch("/api/admin/resources", {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_name,
          capacity,
          location: location || null,
          category_id: Number(categoryId),
          manager_id: managerId === "none" ? null : Number(managerId),
          department_id: departmentId === "none" ? null : Number(departmentId),
          approval_steps_override: approvalSteps === "inherit" ? null : Number(approvalSteps),
        }),
      });
      toast.success("Resource created");
      setIsCreateOpen(false);
      setCategoryId("");
      setManagerId("none");
      setDepartmentId("none");
      setApprovalSteps("inherit");
      queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey({ search: search || undefined }) });
    } catch {
      toast.error("Failed to create resource");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">All Resources</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Resource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="resource_name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.category_id} value={String(c.category_id)}>{c.category_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity *</Label>
                  <Input name="capacity" type="number" min="1" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input name="location" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Assign Manager</Label>
                  <Select value={managerId} onValueChange={setManagerId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {managers?.data?.map((u) => (
                        <SelectItem key={u.user_id} value={String(u.user_id)}>{u.first_name} {u.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department ID</Label>
                  <Input placeholder="e.g. 1" value={departmentId === "none" ? "" : departmentId} onChange={(e) => setDepartmentId(e.target.value || "none")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Approval Flow</Label>
                <Select value={approvalSteps} onValueChange={setApprovalSteps}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit category default</SelectItem>
                    <SelectItem value="0">0 steps (auto-approve)</SelectItem>
                    <SelectItem value="1">1 step</SelectItem>
                    <SelectItem value="2">2 steps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 mb-4">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources?.map((resource) => (
                    <TableRow key={resource.resource_id}>
                      <TableCell className="font-medium">
                        {resource.resource_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{resource.category_name}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {resource.location || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          {resource.capacity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={resource.status} />
                        <div className="text-xs text-muted-foreground mt-1">
                          Approval: {resource.approval_steps === 2 ? "2-step" : resource.approval_steps === 1 ? "1-step" : "Auto"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {resource.manager_name || <span className="text-muted-foreground italic">None</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {resources?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No resources found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
