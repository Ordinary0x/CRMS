import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/shared/StateUI";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface HodAnalyticsData {
  total_bookings: number;
  pending_bookings: number;
  approved_bookings: number;
  rejected_bookings: number;
  cancelled_bookings: number;
  utilization_by_resource: Array<{
    resource_id: number;
    resource_name: string;
    category_name: string;
    total_bookings: number;
    booked_hours: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  Approved: "#22c55e",
  Pending: "#f59e0b",
  Rejected: "#ef4444",
  Cancelled: "#94a3b8",
};

export default function HodAnalytics() {
  const { data, isLoading } = useQuery<HodAnalyticsData>({
    queryKey: ["/api/hod/analytics"],
    queryFn: () => customFetch<HodAnalyticsData>("/api/hod/analytics"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Department Analytics</h2>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  const statusData = [
    { name: "Approved", value: data?.approved_bookings ?? 0 },
    { name: "Pending", value: data?.pending_bookings ?? 0 },
    { name: "Rejected", value: data?.rejected_bookings ?? 0 },
    { name: "Cancelled", value: data?.cancelled_bookings ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Department Analytics</h2>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Bookings", value: data?.total_bookings ?? 0 },
          { label: "Approved", value: data?.approved_bookings ?? 0 },
          { label: "Pending", value: data?.pending_bookings ?? 0 },
          { label: "Rejected", value: data?.rejected_bookings ?? 0 },
          { label: "Cancelled", value: data?.cancelled_bookings ?? 0 },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.utilization_by_resource || data.utilization_by_resource.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No booking data yet</div>
            ) : (
              <div className="space-y-3">
                {data.utilization_by_resource.slice(0, 6).map((r) => (
                  <div key={r.resource_id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate max-w-[60%]">{r.resource_name}</span>
                      <span className="text-muted-foreground">{r.total_bookings} bookings</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, (r.total_bookings / (data?.total_bookings || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
