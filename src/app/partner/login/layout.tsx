import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evalent - Partner Portal",
};

export default function PartnerLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
