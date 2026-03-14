"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartnerIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/partner/dashboard"); }, []);
  return null;
}
