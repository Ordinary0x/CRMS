import { useAdminDashboard, getAdminDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RmAnalytics() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Resource Analytics</h2>
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          Detailed resource analytics view. (Coming Soon)
        </CardContent>
      </Card>
    </div>
  );
}
