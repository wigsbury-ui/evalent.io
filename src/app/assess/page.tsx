"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AssessmentFrame() {
  const searchParams = useSearchParams();
  const formId = searchParams.get("form");

  if (!formId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#666" }}>
        <p>Invalid assessment link.</p>
      </div>
    );
  }

  const jotformParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== "form") {
      jotformParams.set(key, value);
    }
  });

  const jotformUrl =
    "https://form.jotform.com/" +
    formId +
    (jotformParams.toString() ? "?" + jotformParams.toString() : "");

  return (
    <iframe
      src={jotformUrl}
      title="Assessment"
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
      allow="geolocation; microphone; camera; fullscreen"
      allowFullScreen
    />
  );
}

export default function AssessPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentFrame />
    </Suspense>
  );
}
