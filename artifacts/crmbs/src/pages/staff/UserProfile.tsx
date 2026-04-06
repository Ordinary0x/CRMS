import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, Shield } from "lucide-react";

export default function UserProfile() {
  const { dbUser } = useAuth();

  if (!dbUser) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-blue-700 via-cyan-700 to-teal-700 text-white p-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-white/80">User Profile</p>
            <h2 className="mt-2 text-3xl font-bold">{dbUser.first_name} {dbUser.last_name}</h2>
            <p className="mt-2 text-white/85">{dbUser.email}</p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 capitalize">
            {dbUser.role.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-md border p-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Full Name</div>
              <div className="font-medium">{dbUser.first_name} {dbUser.last_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border p-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-medium">{dbUser.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border p-4">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Department</div>
              <div className="font-medium">{dbUser.department_name || "Not assigned"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border p-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium">{dbUser.is_active ? "Active" : "Inactive"}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
