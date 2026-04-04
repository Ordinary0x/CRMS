import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Unauthorized() {
  const { dbUser } = useAuth();
  const [, setLocation] = useLocation();

  const goBack = () => {
    if (dbUser) {
      const rolePrefix = ['student', 'faculty'].includes(dbUser.role) ? 'staff' : dbUser.role;
      setLocation(`/${rolePrefix}/dashboard`);
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-red-200">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Access Denied</CardTitle>
            <CardDescription className="text-base text-red-700/80">
              Unauthorized access attempt
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              Your current role ({dbUser?.role.replace('_', ' ')}) does not have permission to view this page.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center border-t bg-gray-50/50 px-6 py-4">
            <Button onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
