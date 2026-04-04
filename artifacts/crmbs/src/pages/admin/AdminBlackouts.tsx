import { useState } from "react";
import { useAdminListBlackout, useAdminCreateBlackout, useAdminDeleteBlackout, getAdminListBlackoutQueryKey, useListResourceCategories, getListResourceCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/shared/StateUI";
import { Plus, Trash2, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminBlackout() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: blackouts, isLoading } = useAdminListBlackout({
    query: { queryKey: getAdminListBlackoutQueryKey() }
  });

  const { data: categories } = useListResourceCategories({
    query: { queryKey: getListResourceCategoriesQueryKey() }
  });

  const createBlackout = useAdminCreateBlackout();
  const deleteBlackout = useAdminDeleteBlackout();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const start_date = formData.get("start_date") as string;
    const end_date = formData.get("end_date") as string;
    const reason = formData.get("reason") as string;
    const category_id_str = formData.get("category_id") as string;
    const category_id = category_id_str && category_id_str !== "all" ? parseInt(category_id_str) : null;

    try {
      await createBlackout.mutateAsync({
        data: { start_date, end_date, reason: reason || null, category_id }
      });
      toast.success("Blackout period created successfully");
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: getAdminListBlackoutQueryKey() });
    } catch (error) {
      toast.error("Failed to create blackout period");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this blackout period?")) return;
    try {
      await deleteBlackout.mutateAsync({ id });
      toast.success("Blackout period deleted");
      queryClient.invalidateQueries({ queryKey: getAdminListBlackoutQueryKey() });
    } catch (error) {
      toast.error("Failed to delete blackout period");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">System Blackout Periods</h2>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Blackout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Blackout Period</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input name="end_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select name="category_id" defaultValue="all">
                  <SelectTrigger>
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
                <p className="text-xs text-muted-foreground">If selected, only resources in this category will be blocked.</p>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input name="reason" placeholder="e.g. Campus Maintenance" />
              </div>
              <Button type="submit" className="w-full" disabled={createBlackout.isPending}>
                Create Blackout
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
                  <TableHead>Period</TableHead>
                  <TableHead>Category Affected</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blackouts?.map((blackout) => (
                  <TableRow key={blackout.blackout_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <CalendarOff className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(new Date(blackout.start_date), 'MMM d, yyyy')} - {format(new Date(blackout.end_date), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {blackout.category_name ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          {blackout.category_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">All Categories</span>
                      )}
                    </TableCell>
                    <TableCell>{blackout.reason || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(blackout.blackout_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {blackouts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No blackout periods defined
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
