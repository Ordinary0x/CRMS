import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/components/providers/AuthProvider";
import { useListMyBookings, getListMyBookingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/Badges";
import { CardGridSkeleton } from "@/components/shared/StateUI";
import { CalendarClock, ArrowRight, Search, Plus } from "lucide-react";
import { format, isAfter, startOfDay } from "date-fns";

export default function StaffDashboard() {
  const { dbUser } = useAuth();
  
  const { data: bookingsData, isLoading } = useListMyBookings(
    { from_date: format(new Date(), 'yyyy-MM-dd') },
    { query: { queryKey: getListMyBookingsQueryKey({ from_date: format(new Date(), 'yyyy-MM-dd') }) } }
  );

  const upcomingBookings = (bookingsData || []).filter(b => 
    ['approved', 'pending'].includes(b.status_name.toLowerCase()) && 
    (isAfter(new Date(b.date), startOfDay(new Date())) || new Date(b.date).toDateString() === new Date().toDateString())
  ).slice(0, 4) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Welcome, {dbUser?.first_name}</h2>
          <p className="text-muted-foreground mt-1">Here's your schedule and quick actions for today.</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/${dbUser?.role === 'student' ? 'student' : 'staff'}/search`}>
            <Button variant="outline" className="bg-white">
              <Search className="mr-2 h-4 w-4" /> Find Resource
            </Button>
          </Link>
          <Link href={`/${dbUser?.role === 'student' ? 'student' : 'staff'}/book`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Book Now
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Upcoming Bookings</h3>
          <Link href={`/${dbUser?.role === 'student' ? 'student' : 'staff'}/bookings`} className="text-sm text-primary hover:underline font-medium">
            View All
          </Link>
        </div>

        {isLoading ? (
          <CardGridSkeleton count={4} />
        ) : upcomingBookings.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {upcomingBookings.map((booking) => (
              <Card key={booking.booking_id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <StatusBadge status={booking.status_name} />
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      #{booking.booking_id}
                    </span>
                  </div>
                  <CardTitle className="mt-2 text-lg">{booking.resource_name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {format(new Date(booking.date), 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm font-medium pl-6">
                    {booking.start_time} - {booking.end_time}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t mt-auto">
                  <Link href={`/${dbUser?.role === 'student' ? 'student' : 'staff'}/bookings`} className="w-full mt-4">
                    <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-primary">
                      View Details <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No upcoming bookings</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">You don't have any approved or pending bookings coming up in the near future.</p>
              <Link href={`/${dbUser?.role === 'student' ? 'student' : 'staff'}/book`}>
                <Button>Make a Booking</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
