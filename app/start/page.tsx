import { Suspense } from "react";
import StartClient from "./StartClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function StartPage() {
  return (
    <Suspense fallback={<div style={{padding:"24px"}}>Loading…</div>}>
      <StartClient />
    </Suspense>
  );
}
