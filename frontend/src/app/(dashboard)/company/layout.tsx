/**
 * Company Dashboard Layout
 */

"use client";

import { useRequireAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized } = useRequireAuth("company");

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Redirect handled by hook
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
















