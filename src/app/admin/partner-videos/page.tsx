"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MediaLibraryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/content?tab=media");
  }, [router]);
  return (
    <div className="p-8 text-sm text-gray-400 animate-pulse">
      Redirecting to Content Studio…
    </div>
  );
}
