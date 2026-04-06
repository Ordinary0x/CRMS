import { useState } from "react";
import { useListMyBookings, useCancelBooking, getListMyBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Ban, ChevronDown, ChevronRight, Clock, User } from "lucide-react";
import React from "react";

export default function StaffBookings() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();

  const { data, isLoading } = useListMyBookings(
    {}, // Default params
    { query: { queryKey: getListMyBookingsQueryKey({}) } }
  );
  const bookings = data || [];

  const cancelBooking = useCancelBooking();
  const handleCancel = async (id: number) => {
    try {
      await cancelBooking.mutateAsync({ id });
      toast.success("Booking cancelled successfully");
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey({}) });
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary">My Bookings</h2>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <div className="border-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => {
                    const bookingDatePart = String(booking.date).slice(0, 10);
                    const bookingStartPart = String(booking.start_time).slice(0, 8);
                    const startAt = new Date(`${bookingDatePart}T${bookingStartPart}`);
                    const canCancel = ["pending", "approved"].includes(booking.status_name.toLowerCase()) && !Number.isNaN(startAt.getTime()) && startAt > new Date();
                    return (
                    <React.Fragment key={booking.booking_id}>
                      <TableRow
                        className={`cursor-pointer hover:bg-muted/30 ${expandedId === booking.booking_id ? 'bg-muted/30' : ''}`}
                        onClick={() => setExpandedId(expandedId === booking.booking_id ? null : booking.booking_id)}
                      >
                        <TableCell>
                          {expandedId === booking.booking_id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">#{booking.booking_id}</TableCell>
                        <TableCell className="font-medium text-foreground">{booking.resource_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{format(parseISO(booking.date), 'MMM d, yyyy')}</span>
                              <span className="text-xs text-muted-foreground flex items-center mt-1">
                               <Clock className="w-3 h-3 mr-1" /> {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                              </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={booking.status_name} />
                        </TableCell>
                        <TableCell>
                          {canCancel && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                                  <Ban className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking for {booking.resource_name} on {format(parseISO(booking.date), 'MMM d, yyyy')}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Close</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancel(booking.booking_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Confirm Cancellation
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedId === booking.booking_id && (
                        <TableRow className="bg-muted/10">
                          <TableCell colSpan={6} className="p-0 border-b-0">
                            <div className="p-6 border-b border-t border-dashed bg-white">
                              <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Booking Details</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs text-muted-foreground">Purpose</div>
                                      <div className="text-sm mt-1">{booking.purpose || 'No purpose provided'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Category</div>
                                      <div className="text-sm mt-1">{booking.category_name}</div>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Approval Trail</h4>
                                  <div className="space-y-4">
                                    {booking.approvals && booking.approvals.length > 0 ? (
                                      booking.approvals.map((approval, idx) => (
                                        <div key={idx} className="relative pl-6 pb-2 border-l-2 border-gray-200 last:border-0 last:pb-0">
                                          <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white ${
                                            approval.decision === 'approved' ? 'bg-green-500' :
                                            approval.decision === 'rejected' ? 'bg-red-500' :
                                            'bg-amber-400'
                                          }`} />
                                          <div className="text-sm font-medium flex items-center">
                                            Step {approval.step_number}: {approval.decision ? <span className="capitalize ml-1">{approval.decision}</span> : <span className="text-amber-600 ml-1">Pending</span>}
                                          </div>
                                          {approval.approver_name && (
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center">
                                              <User className="h-3 w-3 mr-1" /> {approval.approver_name}
                                              {approval.approval_time && <span className="ml-2">• {format(new Date(approval.approval_time), 'MMM d, h:mm a')}</span>}
                                            </div>
                                          )}
                                          {approval.remarks && (
                                            <div className="text-xs mt-2 bg-gray-50 p-2 rounded border italic">
                                              "{approval.remarks}"
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-sm text-muted-foreground italic">No approval data available</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                    );
                  })}
                  {bookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center">
                          <Clock className="h-12 w-12 text-gray-300 mb-4" />
                          <p>You don't have any bookings yet.</p>
                        </div>
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
  const formatTime = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  };
