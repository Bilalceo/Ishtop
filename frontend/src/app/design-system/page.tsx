import type { Metadata } from "next";
import DesignSystemClient from "@/components/design-system/DesignSystemClient";

export const metadata: Metadata = {
  title: "IshTop — Aurora Design System",
  description:
    "Live component gallery, design tokens, motion primitives and brand guidelines for the IshTop platform.",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
