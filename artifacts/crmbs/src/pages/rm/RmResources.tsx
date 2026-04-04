import { useRmListResources, useRmCreateResource, useRmUpdateResourceStatus, getRmListResourcesQueryKey, useListResourceCategories, getListResourceCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { Plus, Edit, Settings, Database, Users, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function RmResources() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState("");
  
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

    try {
      await createResource.mutateAsync({
        data: { 
          resource_name, 
          capacity, 
          location: location || null, 
          category_id,
          features: featuresObj
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Managed Resources</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) { setFeatures([]); setFeatureInput(""); setCreateCategoryId(""); }
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
                          <DropdownMenuItem onClick={() => {}}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
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
    </div>
  );
}
