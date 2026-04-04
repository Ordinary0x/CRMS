import { useState } from "react";
import { useAdminListBookings, useAdminCancelBooking, getAdminListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Ban } from "lucide-react";

export default function AdminBookings() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const queryClient = useQueryClient();

  const { data, isLoading } = useAdminListBookings(
    { page, limit: 10, status: statusFilter !== "all" ? statusFilter : undefined },
    { query: { queryKey: getAdminListBookingsQueryKey({ page, limit: 10, status: statusFilter !== "all" ? statusFilter : undefined }) } }
  );

  const cancelBooking = useAdminCancelBooking();

  const handleCancel = async (id: number) => {
    try {
      await cancelBooking.mutateAsync({ id });
      toast.success("Booking cancelled by admin");
      queryClient.invalidateQueries({ queryKey: getAdminListBookingsQueryKey() });
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">System Bookings</h2>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="w-full sm:w-[250px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                    <TableHead>ID</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((booking) => (
                    <TableRow key={booking.booking_id}>
                      <TableCell className="font-medium">#{booking.booking_id}</TableCell>
                      <TableCell>{booking.resource_name}</TableCell>
                      <TableCell>{booking.user_name}</TableCell>
                      <TableCell><PriorityBadge level={booking.priority_level} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(booking.date), 'MMM d, yyyy')}</span>
                          <span className="text-xs text-muted-foreground">{booking.start_time} - {booking.end_time}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status_name} />
                      </TableCell>
                      <TableCell>
                        {['pending', 'approved'].includes(booking.status_name.toLowerCase()) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Ban className="h-4 w-4 mr-2" /> Cancel
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Booking (Admin Override)</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to administratively cancel this booking? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Close</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancel(booking.booking_id)} className="bg-destructive text-destructive-foreground">
                                  Force Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No bookings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {data ? `Showing ${(page - 1) * 10 + 1} to ${Math.min(page * 10, data.total)} of ${data.total} bookings` : ''}
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
