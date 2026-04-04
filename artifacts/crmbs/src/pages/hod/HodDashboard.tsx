import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, CheckSquare } from "lucide-react";
import { CardGridSkeleton } from "@/components/shared/StateUI";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface HodDashboardData {
  dept_users: number;
  pending_approvals: number;
  bookings_today: number;
  recent_pending: Array<{
    approval_id: number;
    booking_id: number;
    date: string;
    start_time: string;
    end_time: string;
    purpose: string;
    resource_name: string;
    requester_name: string;
  }>;
}

export default function HodDashboard() {
  const { data, isLoading } = useQuery<HodDashboardData>({
    queryKey: ["/api/hod/dashboard"],
    queryFn: () => customFetch<HodDashboardData>("/api/hod/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Department Dashboard</h2>
        <CardGridSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Department Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Department Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.dept_users ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pending_approvals ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting your decision</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookings Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.bookings_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">Across all department resources</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Step-2 Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.recent_pending || data.recent_pending.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No pending approvals
            </div>
          ) : (
            <div className="space-y-4">
              {data.recent_pending.map((item) => (
                <div key={item.approval_id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.resource_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.requester_name} · {format(new Date(item.date), 'dd MMM yyyy')} · {item.start_time} – {item.end_time}
                    </p>
                    {item.purpose && <p className="text-xs text-muted-foreground italic mt-1">{item.purpose}</p>}
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Pending Step 2
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
