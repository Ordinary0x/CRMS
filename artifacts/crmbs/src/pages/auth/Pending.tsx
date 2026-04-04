import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Pending() {
  const { dbUser, firebaseUser, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!firebaseUser) {
      setLocation("/login");
    } else if (dbUser?.is_active) {
      setLocation(`/${dbUser.role === 'student' || dbUser.role === 'faculty' ? 'staff' : dbUser.role}/dashboard`);
    }
  }, [firebaseUser, dbUser, setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-amber-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-900">Account Pending</CardTitle>
            <CardDescription className="text-base text-amber-700/80">
              Your account is awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Thank you for registering. Your account ({firebaseUser?.email}) is currently pending activation by an administrator or your Department Head.
            </p>
            <p className="text-sm text-gray-600">
              You will be notified once your account is active.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center border-t bg-gray-50/50 px-6 py-4">
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
