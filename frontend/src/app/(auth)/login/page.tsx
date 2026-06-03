import { Suspense } from "react";
import LoginPageClient from "./page.client";

export default function LoginPage() {
  // Next.js requires a Suspense boundary when a route uses `useSearchParams()`.
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md p-6 text-center text-surface-500">
          Yuklanmoqda... / Загрузка...
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}

