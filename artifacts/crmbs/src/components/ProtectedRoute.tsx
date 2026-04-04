import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { dbUser, token, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!token) {
        setLocation('/login');
      } else if (dbUser) {
        if (!dbUser.is_active) {
          setLocation('/pending');
        } else if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
          setLocation('/unauthorized');
        }
      }
    }
  }, [loading, token, dbUser, allowedRoles, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || (dbUser && (!dbUser.is_active || (allowedRoles && !allowedRoles.includes(dbUser.role))))) {
    return null;
  }

  return <>{children}</>;
}
