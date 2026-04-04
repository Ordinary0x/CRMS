import { useState } from "react";
import { useGetUtilization, useGetAnalyticsByDepartment, useGetApprovalStats, getGetUtilizationQueryKey, getGetAnalyticsByDepartmentQueryKey, getGetApprovalStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAnalytics() {
  const { data: utilizationData, isLoading: utilLoading } = useGetUtilization({ query: { queryKey: getGetUtilizationQueryKey() } });
  const { data: deptData, isLoading: deptLoading } = useGetAnalyticsByDepartment({}, { query: { queryKey: getGetAnalyticsByDepartmentQueryKey({}) } });
  const { data: approvalData, isLoading: appLoading } = useGetApprovalStats({ query: { queryKey: getGetApprovalStatsQueryKey() } });

  const exportCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">System Analytics</h2>
      </div>

      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization">Resource Utilization</TabsTrigger>
          <TabsTrigger value="departments">Department Usage</TabsTrigger>
          <TabsTrigger value="approvals">Approval SLA</TabsTrigger>
        </TabsList>

        <TabsContent value="utilization" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(utilizationData || [], 'utilization')}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Bookings by Resource (Current Week)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {!utilLoading && utilizationData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={utilizationData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="resource_name" angle={-45} textAnchor="end" height={60} fontSize={12} />
                      <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-3))" />
                      <RechartsTooltip />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar yAxisId="left" dataKey="total_bookings" name="Total Bookings" fill="hsl(var(--primary))" />
                      <Bar yAxisId="right" dataKey="booked_hours" name="Booked Hours" fill="hsl(var(--chart-3))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">Loading chart...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(deptData || [], 'department-usage')}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Department Booking Breakdown</CardTitle>
              <CardDescription>Approved vs Rejected bookings by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {!deptLoading && deptData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis dataKey="dept_name" type="category" width={90} fontSize={12} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="approved_bookings" name="Approved" stackId="a" fill="hsl(var(--chart-3))" />
                      <Bar dataKey="rejected_bookings" name="Rejected" stackId="a" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">Loading chart...</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Step 1 Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvalData?.avg_step1_hours.toFixed(1) || 0} hrs</div>
                <p className="text-xs text-muted-foreground">Resource Manager Approval</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Step 2 Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvalData?.avg_step2_hours.toFixed(1) || 0} hrs</div>
                <p className="text-xs text-muted-foreground">HOD Approval</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((approvalData?.total_approved || 0) + (approvalData?.total_rejected || 0))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {approvalData?.rejection_rate.toFixed(1) || 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
