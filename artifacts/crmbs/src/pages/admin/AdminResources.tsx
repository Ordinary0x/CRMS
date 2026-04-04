import { useState } from "react";
import { useListResources, getListResourcesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminResources() {
  const [search, setSearch] = useState("");

  const { data: resources, isLoading } = useListResources(
    { search: search || undefined },
    { query: { queryKey: getListResourcesQueryKey({ search: search || undefined }) } }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">All Resources</h2>
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
                          {resource.location || '-'}
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
