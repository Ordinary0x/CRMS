import { useState } from "react";
import { useListResources, useListResourceCategories, getListResourcesQueryKey, getListResourceCategoriesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardGridSkeleton } from "@/components/shared/StateUI";
import { Search, Users, MapPin, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function StaffSearch() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [minCapacity, setMinCapacity] = useState("");
  const [, setLocation] = useLocation();

  const { data: categories } = useListResourceCategories({
    query: { queryKey: getListResourceCategoriesQueryKey() }
  });

  const queryParams = {
    search: search || undefined,
    category_id: category !== "all" ? parseInt(category) : undefined,
    min_capacity: minCapacity ? parseInt(minCapacity) : undefined
  };

  const { data: resources, isLoading } = useListResources(
    queryParams,
    { query: { queryKey: getListResourcesQueryKey(queryParams) } }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Resource Directory</h2>
          <p className="text-muted-foreground mt-1">Find and explore available campus facilities.</p>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, location, or feature..." 
                  className="pl-8 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(c => (
                    <SelectItem key={c.category_id} value={c.category_id.toString()}>
                      {c.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Capacity</Label>
              <Input 
                type="number" 
                placeholder="e.g. 50" 
                className="bg-white"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources?.map((resource) => (
            <Card key={resource.resource_id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-3 bg-primary" />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="mb-2">{resource.category_name}</Badge>
                  {resource.status === 'active' ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>
                  ) : resource.status === 'inactive' ? (
                    <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Inactive</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Maintenance</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{resource.resource_name}</CardTitle>
                <CardDescription className="flex items-center mt-2 text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-3 w-3" /> {resource.location || 'Location TBA'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center text-sm font-medium text-foreground mb-4">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  Capacity: {resource.capacity} people
                </div>
                
                {resource.features && Object.keys(resource.features).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(resource.features).map((feature) => (
                      <Badge key={feature} variant="secondary" className="bg-gray-100 text-gray-700 text-xs font-normal">
                        {feature.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-gray-50 border-t pt-4">
                <Button 
                  className="w-full" 
                  disabled={resource.status !== 'active'}
                  onClick={() => {
                    const currentPath = window.location.pathname;
                    const rolePrefix = currentPath.split('/')[1];
                    setLocation(`/${rolePrefix}/book?resource=${resource.resource_id}`);
                  }}
                >
                  {resource.status === 'active' ? 'Book Resource' : 'Unavailable'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          {resources?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No resources found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
