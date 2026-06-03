/**
 * Admin Dashboard Layout
 */

"use client";

import { useRequireAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized } = useRequireAuth("admin");

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
