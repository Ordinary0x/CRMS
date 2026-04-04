import { useHodListPendingApprovals, useHodDecideApproval, getHodListPendingApprovalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/shared/StateUI";
import { PriorityBadge } from "@/components/shared/Badges";
import { format, differenceInHours } from "date-fns";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function HodApprovals() {
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  
  const queryClient = useQueryClient();

  const { data: approvals, isLoading } = useHodListPendingApprovals({
    query: { queryKey: getHodListPendingApprovalsQueryKey() }
  });

  const decideApproval = useHodDecideApproval();

  const handleDecision = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedApproval || !decision) return;
    
    const formData = new FormData(e.currentTarget);
    const remarks = formData.get("remarks") as string;

    if (decision === 'rejected' && !remarks.trim()) {
      toast.error("Remarks are required for rejections");
      return;
    }

    try {
      await decideApproval.mutateAsync({
        id: selectedApproval.approval_id,
        data: { decision, remarks: remarks || null }
      });
      toast.success(`Booking ${decision} successfully`);
      setSelectedApproval(null);
      queryClient.invalidateQueries({ queryKey: getHodListPendingApprovalsQueryKey() });
    } catch (error) {
      toast.error("Failed to process approval");
    }
  };

  const getSLAWarning = (createdAt: string) => {
    const hours = differenceInHours(new Date(), new Date(createdAt));
    if (hours > 24) {
      return (
        <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" /> {hours}h overdue
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Pending Approvals (HOD / Step 2)</h2>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>RM Approval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals?.map(approval => (
                  <TableRow key={approval.approval_id}>
                    <TableCell>
                      <div className="font-medium">{approval.requester_name}</div>
                      <div className="text-xs text-muted-foreground">{approval.requester_email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{approval.resource_name}</div>
                      <div className="text-xs text-muted-foreground">{approval.category_name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{format(new Date(approval.date), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">{approval.start_time} - {approval.end_time}</div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge level={approval.priority_level} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={approval.purpose || ''}>
                      {approval.purpose || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {approval.step1_approved_by ? `Approved by ${approval.step1_approved_by}` : '-'}
                      {getSLAWarning(approval.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={selectedApproval?.approval_id === approval.approval_id && decision === 'approved'} onOpenChange={(open) => {
                          if (open) { setSelectedApproval(approval); setDecision('approved'); }
                          else { setSelectedApproval(null); setDecision(null); }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100">
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Booking</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleDecision} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Remarks (Optional)</Label>
                                <Textarea name="remarks" placeholder="Add any conditions or remarks..." />
                              </div>
                              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={decideApproval.isPending}>
                                Confirm Approval
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={selectedApproval?.approval_id === approval.approval_id && decision === 'rejected'} onOpenChange={(open) => {
                          if (open) { setSelectedApproval(approval); setDecision('rejected'); }
                          else { setSelectedApproval(null); setDecision(null); }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100">
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Booking</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleDecision} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Reason for Rejection *</Label>
                                <Textarea name="remarks" placeholder="Please provide a reason..." required />
                              </div>
                              <Button type="submit" variant="destructive" className="w-full" disabled={decideApproval.isPending}>
                                Confirm Rejection
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {approvals?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No pending approvals at this time.
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
