import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, XOctagon, CheckSquare, AlertCircle, Wrench } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200"><XOctagon className="w-3 h-3 mr-1" /> Cancelled</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckSquare className="w-3 h-3 mr-1" /> Completed</Badge>;
    case 'active':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
    case 'inactive':
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200"><XOctagon className="w-3 h-3 mr-1" /> Inactive</Badge>;
    case 'maintenance':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Wrench className="w-3 h-3 mr-1" /> Maintenance</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function PriorityBadge({ level }: { level: number }) {
  switch (level) {
    case 1:
      return <Badge variant="destructive" className="font-mono text-xs">P1 Admin</Badge>;
    case 2:
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 font-mono text-xs" variant="outline">P2 Manager</Badge>;
    case 3:
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 font-mono text-xs" variant="outline">P3 Staff</Badge>;
    case 4:
    default:
      return <Badge variant="secondary" className="font-mono text-xs">P4 Student</Badge>;
  }
}
