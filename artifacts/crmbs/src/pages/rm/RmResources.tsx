import { useRmListResources, useRmCreateResource, useRmUpdateResourceStatus, getRmListResourcesQueryKey, useListResourceCategories, getListResourceCategoriesQueryKey, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { Plus, Edit, Settings, Database, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Trash2 } from "lucide-react";

export default function RmResources() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createApprovalSteps, setCreateApprovalSteps] = useState("inherit");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editApprovalSteps, setEditApprovalSteps] = useState("0");
  const [editStatus, setEditStatus] = useState("active");
  
  const queryClient = useQueryClient();

  const { data: resources, isLoading } = useRmListResources({
    query: { queryKey: getRmListResourcesQueryKey() }
  });

  const { data: categories } = useListResourceCategories({
    query: { queryKey: getListResourceCategoriesQueryKey() }
  });

  const createResource = useRmCreateResource();
  const updateStatus = useRmUpdateResourceStatus();

  const addFeature = () => {
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput("");
    }
  };

  const removeFeature = (f: string) => {
    setFeatures(features.filter(item => item !== f));
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const resource_name = formData.get("resource_name") as string;
    const capacity = parseInt(formData.get("capacity") as string);
    const location = formData.get("location") as string;
    const category_id = parseInt(createCategoryId, 10);

    if (!category_id) {
      toast.error("Please select a category");
      return;
    }
    
    // Transform features array into object map { "projector": true, "wifi": true }
    const featuresObj = features.reduce((acc, curr) => ({ ...acc, [curr.toLowerCase().replace(/ /g, '_')]: true }), {});
    const approval_steps_override = createApprovalSteps === "inherit" ? undefined : Number(createApprovalSteps);

    try {
      await createResource.mutateAsync({
        data: { 
          resource_name, 
          capacity, 
          location: location || null, 
          category_id,
          features: {
            ...featuresObj,
            approval_steps_override: approval_steps_override ?? null,
          },
        }
      });
      toast.success("Resource created successfully");
      setIsCreateOpen(false);
      setFeatures([]);
      queryClient.invalidateQueries({ queryKey: getRmListResourcesQueryKey() });
    } catch (error) {
      toast.error("Failed to create resource");
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateStatus.mutateAsync({
        id,
        data: { status }
      });
      toast.success(`Resource marked as ${status}`);
      queryClient.invalidateQueries({ queryKey: getRmListResourcesQueryKey() });
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleOpenEdit = (resource: any) => {
    setEditingResource(resource);
    setEditCategoryId(String(resource.category_id));
    setEditApprovalSteps(resource.approval_steps === 2 ? "2" : resource.approval_steps === 1 ? "1" : "0");
    setEditStatus(resource.status || "active");
    setIsEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingResource) return;

    const formData = new FormData(e.currentTarget);
    try {
      await customFetch(`/api/rm/resources/${editingResource.resource_id}`, {
        method: "PATCH",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_name: (formData.get("resource_name") as string)?.trim(),
          capacity: Number(formData.get("capacity")),
          location: ((formData.get("location") as string) || "").trim() || null,
          status: editStatus,
          category_id: Number(editCategoryId),
          approval_steps_override: Number(editApprovalSteps),
        }),
      });

      toast.success("Resource updated successfully");
      setIsEditOpen(false);
      setEditingResource(null);
      queryClient.invalidateQueries({ queryKey: getRmListResourcesQueryKey() });
    } catch {
      toast.error("Failed to update resource");
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const result = await customFetch<{ message: string }>(`/api/rm/resources/${id}`, {
        method: "DELETE",
        responseType: "json",
      });
      toast.success(result.message || "Resource updated");
      queryClient.invalidateQueries({ queryKey: getRmListResourcesQueryKey() });
    } catch {
      toast.error("Failed to remove resource");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Managed Resources</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) { setFeatures([]); setFeatureInput(""); setCreateCategoryId(""); setCreateApprovalSteps("inherit"); }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Resource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Resource Name *</Label>
                <Input name="resource_name" required placeholder="e.g. Conference Room A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={createCategoryId} onValueChange={setCreateCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => (
                        <SelectItem key={c.category_id} value={c.category_id.toString()}>
                          {c.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity *</Label>
                  <Input name="capacity" type="number" required min="1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input name="location" placeholder="Building/Room number" />
              </div>
              <div className="space-y-2">
                <Label>Approval Flow</Label>
                <Select value={createApprovalSteps} onValueChange={setCreateApprovalSteps}>
                  <SelectTrigger>
                    <SelectValue placeholder="Inherit category default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit category default</SelectItem>
                    <SelectItem value="0">0 steps (auto-approve)</SelectItem>
                    <SelectItem value="1">1 step (RM)</SelectItem>
                    <SelectItem value="2">2 steps (RM + HOD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Features (Tags)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={featureInput} 
                    onChange={e => setFeatureInput(e.target.value)} 
                    onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                    placeholder="e.g. Projector (press Enter)" 
                  />
                  <Button type="button" variant="secondary" onClick={addFeature}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {features.map((f, i) => (
                    <div key={i} className="bg-muted px-2 py-1 rounded-md text-sm flex items-center gap-1">
                      {f} <button type="button" onClick={() => removeFeature(f)} className="text-muted-foreground hover:text-foreground">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createResource.isPending}>
                Create Resource
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
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources?.map((resource) => (
                  <TableRow key={resource.resource_id}>
                    <TableCell>
                      <div className="font-medium flex items-center">
                        <Database className="h-4 w-4 text-muted-foreground mr-2" />
                        {resource.resource_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 inline-block px-2 py-0.5 rounded bg-muted">
                        {resource.category_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center"><Users className="h-3 w-3 mr-2" /> Cap: {resource.capacity}</div>
                        <div className="flex items-center"><MapPin className="h-3 w-3 mr-2" /> {resource.location || 'N/A'}</div>
                      </div>
                    </TableCell>
                      <TableCell>
                        <StatusBadge status={resource.status} />
                        <div className="text-xs text-muted-foreground mt-1">
                          Approval: {resource.approval_steps === 2 ? "2-step" : resource.approval_steps === 1 ? "1-step" : "Auto"}
                        </div>
                      </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEdit(resource)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(resource.resource_id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleStatusChange(resource.resource_id, 'active')} disabled={resource.status === 'active'}>
                            <div className="flex items-center text-green-600"><div className="w-2 h-2 rounded-full bg-green-600 mr-2" /> Active</div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(resource.resource_id, 'maintenance')} disabled={resource.status === 'maintenance'}>
                            <div className="flex items-center text-amber-600"><div className="w-2 h-2 rounded-full bg-amber-600 mr-2" /> Maintenance</div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(resource.resource_id, 'inactive')} disabled={resource.status === 'inactive'}>
                            <div className="flex items-center text-gray-600"><div className="w-2 h-2 rounded-full bg-gray-600 mr-2" /> Inactive</div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {resources?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      You are not managing any resources yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          {editingResource ? (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Resource Name *</Label>
                <Input name="resource_name" defaultValue={editingResource.resource_name} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.category_id} value={String(c.category_id)}>{c.category_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Capacity *</Label>
                  <Input name="capacity" type="number" required min="1" defaultValue={editingResource.capacity} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input name="location" defaultValue={editingResource.location || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Approval Flow</Label>
                  <Select value={editApprovalSteps} onValueChange={setEditApprovalSteps}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 steps (auto)</SelectItem>
                      <SelectItem value="1">1 step</SelectItem>
                      <SelectItem value="2">2 steps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
