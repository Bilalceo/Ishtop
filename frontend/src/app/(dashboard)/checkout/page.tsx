import { Suspense } from "react";
import CheckoutPageClient from "./page.client";

export default function CheckoutPage() {
  // Next.js requires a Suspense boundary when a route reads query params client-side.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-surface-500">
          To'lov sahifasi yuklanmoqda... / Загружается страница оплаты...
        </div>
      }
    >
      <CheckoutPageClient />
    </Suspense>
  );
}

