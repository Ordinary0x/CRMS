import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { customFetch } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Building2, Shield } from "lucide-react";
import { toast } from "sonner";

type DepartmentOption = {
  department_id: number;
  dept_name: string;
};

export default function UserProfile() {
  const { dbUser, refreshUser } = useAuth();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentId, setDepartmentId] = useState("none");
  const [saving, setSaving] = useState(false);

  if (!dbUser) return null;

  useEffect(() => {
    const currentDepartment = dbUser.department_id;
    setDepartmentId(currentDepartment ? String(currentDepartment) : "none");
  }, [dbUser.department_id]);

  useEffect(() => {
    let active = true;

    customFetch<DepartmentOption[]>("/api/auth/departments", {
      responseType: "json",
    })
      .then((rows) => {
        if (active) {
          setDepartments(rows ?? []);
        }
      })
      .catch(() => {
        toast.error("Failed to load departments");
      });

    return () => {
      active = false;
    };
  }, []);

  const onSaveDepartment = async () => {
    setSaving(true);
    try {
      await customFetch("/api/auth/me", {
        method: "PATCH",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_id: departmentId === "none" ? null : Number(departmentId),
        }),
      });
      await refreshUser();
      toast.success("Department updated");
    } catch {
      toast.error("Failed to update department");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="rounded-md border p-4 md:col-span-2 space-y-3">
            <div>
              <Label>Department</Label>
              <p className="text-xs text-muted-foreground mt-1">Students can select their department from here.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="sm:max-w-md">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.department_id} value={String(dept.department_id)}>
                      {dept.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={onSaveDepartment} disabled={saving}>
                {saving ? "Saving..." : "Save Department"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
