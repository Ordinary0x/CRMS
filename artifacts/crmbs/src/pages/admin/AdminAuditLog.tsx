import React, { useState } from "react";
import { useAdminGetAuditLog, getAdminGetAuditLogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/shared/StateUI";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useAdminGetAuditLog(
    { page, limit: 10, table_name: tableFilter !== "all" ? tableFilter : undefined },
    { query: { queryKey: getAdminGetAuditLogQueryKey({ page, limit: 10, table_name: tableFilter !== "all" ? tableFilter : undefined }) } }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">System Audit Log</h2>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="w-full sm:w-[250px]">
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="resource">Resources</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="department">Departments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Operation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((log) => (
                    <React.Fragment key={log.audit_id}>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === log.audit_id ? null : log.audit_id)}
                      >
                        <TableCell>
                          {expandedId === log.audit_id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell>{format(new Date(log.changed_at), 'MMM d, yyyy HH:mm:ss')}</TableCell>
                        <TableCell>{log.changed_by_name || 'System'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.table_name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                            log.operation === 'INSERT' ? 'bg-green-100 text-green-800' :
                            log.operation === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {log.operation}
                          </span>
                        </TableCell>
                      </TableRow>
                      {expandedId === log.audit_id && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Previous State</h4>
                                <pre className="bg-card p-4 rounded border text-xs overflow-x-auto">
                                  {log.old_data ? JSON.stringify(log.old_data, null, 2) : 'null'}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">New State</h4>
                                <pre className="bg-card p-4 rounded border text-xs overflow-x-auto">
                                  {log.new_data ? JSON.stringify(log.new_data, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No audit records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {data ? `Showing ${(page - 1) * 10 + 1} to ${Math.min(page * 10, data.total)} of ${data.total} records` : ''}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data || page * 10 >= data.total}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
