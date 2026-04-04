import { useState } from "react";
import { useHodListBookings, getHodListBookingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/shared/Badges";
import { TableSkeleton } from "@/components/shared/StateUI";
import { format } from "date-fns";

export default function HodBookings() {
  const { data, isLoading } = useHodListBookings(
    { query: { queryKey: getHodListBookingsQueryKey() } }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Department Bookings</h2>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((booking) => (
                  <TableRow key={booking.booking_id}>
                    <TableCell className="font-medium">{booking.user_name}</TableCell>
                    <TableCell>
                      {booking.resource_name}
                      <div className="text-xs text-muted-foreground">{booking.category_name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{format(new Date(booking.date), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">{booking.start_time} - {booking.end_time}</div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge level={booking.priority_level} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status_name} />
                    </TableCell>
                  </TableRow>
                ))}
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No bookings from your department yet.
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
