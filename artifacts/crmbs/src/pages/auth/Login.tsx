import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/components/providers/AuthProvider";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setToken } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const firebaseCredential = await signInWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      const firebaseToken = await firebaseCredential.user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid email or password");
      }

      const { token, user } = await res.json();
      setToken(token);

      if (!user.is_active) {
        setLocation("/pending");
        return;
      }

      const rolePrefix = user.role === 'resource_manager' ? 'rm' : user.role === 'faculty' ? 'staff' : user.role;
      setLocation(`/${rolePrefix}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const firebaseUser = credential.user;
      const idToken = await firebaseUser.getIdToken();

      if (!firebaseUser.email) {
        throw new Error("Google account does not have an email.");
      }

      const displayName = firebaseUser.displayName?.trim() || "";
      const [firstName, ...lastNameParts] = displayName ? displayName.split(/\s+/) : ["User"];
      const lastName = lastNameParts.join(" ") || "User";

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          first_name: firstName || "User",
          last_name: lastName,
          email: firebaseUser.email,
          firebase_uid: firebaseUser.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Google sign-in failed");
      }

      const result = await res.json();
      setToken(result.token);

      if (!result.is_active) {
        setLocation("/pending");
        return;
      }

      const rolePrefix = result.role === 'resource_manager' ? 'rm' : result.role === 'faculty' ? 'staff' : result.role;
      setLocation(`/${rolePrefix}/dashboard`);
    } catch (err: any) {
      if (err?.code === "auth/configuration-not-found" || err?.code === "auth/operation-not-allowed") {
        setError("Google Sign-In is not enabled in Firebase Console. Enable it in Authentication > Sign-in method > Google, then add localhost/127.0.0.1 in Authorized domains.");
      } else if (err?.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Firebase Auth. Add localhost and 127.0.0.1 under Firebase Authentication > Settings > Authorized domains.");
      } else {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary">
          <CalendarClock className="h-12 w-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to CRMBS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Campus Resource Management and Booking System — NIT Calicut
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your institutional email and password to access the portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>

              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading || isLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue with Google
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t px-6 py-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
