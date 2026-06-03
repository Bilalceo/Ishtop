import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline · IshTop",
  description: "Internet aloqasi yo'q. Cached sahifalarni ko'rishingiz mumkin.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#faf9f5] text-[#141413] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full"
          style={{ background: "#d97757", color: "white", fontSize: 28 }}
          aria-hidden
        >
          ✦
        </div>
        <h1
          className="mt-8 text-4xl font-semibold"
          style={{ fontFamily: "var(--font-poppins), Arial, sans-serif" }}
        >
          Internet yo&apos;q
        </h1>
        <p
          className="mt-4 text-lg leading-relaxed text-[#52514e]"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          Aloqani tekshiring. Avval ochilgan sahifalar va saqlangan ishlar oflayn rejimda
          ko&apos;rinadi.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/student"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-sm font-medium text-white"
          >
            Dashboardga qaytish
          </Link>
          <Link
            href="/student/saved-jobs"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#141413] px-6 py-3 text-sm font-medium text-[#141413]"
          >
            Saqlangan ishlar
          </Link>
        </div>
      </div>
    </main>
  );
}
