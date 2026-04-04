import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/shared/StateUI";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RmAnalyticsData {
  total_resources: number;
  active_resources: number;
  maintenance_resources: number;
  total_bookings: number;
  approved_bookings: number;
  pending_bookings: number;
  rejected_bookings: number;
  utilization_by_resource: Array<{
    resource_id: number;
    resource_name: string;
    category_name: string;
    total_bookings: number;
    approved_bookings: number;
    pending_bookings: number;
  }>;
}

export default function RmAnalytics() {
  const { data, isLoading } = useQuery<RmAnalyticsData>({
    queryKey: ["/api/rm/analytics"],
    queryFn: () => customFetch<RmAnalyticsData>("/api/rm/analytics"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Resource Analytics</h2>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  const resourceChartData = (data?.utilization_by_resource ?? []).slice(0, 8).map((r) => ({
    name: r.resource_name.length > 16 ? r.resource_name.slice(0, 16) + "…" : r.resource_name,
    bookings: r.total_bookings,
    approved: r.approved_bookings,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Resource Analytics</h2>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Resources", value: data?.total_resources ?? 0 },
          { label: "Active", value: data?.active_resources ?? 0 },
          { label: "In Maintenance", value: data?.maintenance_resources ?? 0 },
          { label: "Total Bookings", value: data?.total_bookings ?? 0 },
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
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Bookings per Resource</CardTitle>
          </CardHeader>
          <CardContent>
            {resourceChartData.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No booking data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={resourceChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="bookings" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Resource Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.utilization_by_resource || data.utilization_by_resource.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No data available</div>
            ) : (
              <div className="space-y-3">
                {data.utilization_by_resource.map((r) => (
                  <div key={r.resource_id} className="flex items-center gap-4 text-sm border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-medium">{r.resource_name}</p>
                      <p className="text-xs text-muted-foreground">{r.category_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{r.total_bookings} total</p>
                      <p className="text-xs text-green-600">{r.approved_bookings} approved · {r.pending_bookings} pending</p>
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
