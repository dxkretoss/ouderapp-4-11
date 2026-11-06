import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/PageLoader";

export function AuthGuard() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  // Demo mode explicitly bypasses auth checks so users can explore the app
  const isDemo = typeof window !== "undefined" && localStorage.getItem("onzeapp_demo_mode") === "true";
  if (isDemo) {
    return <Outlet />;
  }

  // If not logged in -> redirect to welcome screen per user requirement
  if (!user) {
    return <Navigate to="/welkom" replace />;
  }

  // If authenticated but email is not verified -> redirect to OTP verification screen
  const isVerified = Boolean(profile?.is_verified ?? user?.is_verified ?? false);
  if (!isVerified) {
    const emailParam = encodeURIComponent(user.email || profile?.email || "");
    return <Navigate to={`/register?verify=true&email=${emailParam}`} replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
