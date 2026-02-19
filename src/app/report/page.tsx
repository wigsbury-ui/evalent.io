"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReportViewer() {
  const params = useSearchParams();
  const submissionId = params.get("id");

  if (!submissionId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "Arial" }}>
        <h1>Evalent Report Viewer</h1>
        <p>No submission ID provided. Add ?id=xxx to the URL.</p>
      </div>
    );
  }

  const reportUrl = `/api/report?submission_id=${submissionId}`;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "8px 16px",
          background: "#1a365d",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: "bold" }}>Evalent Report Preview</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              const iframe = document.getElementById(
                "report-frame"
              ) as HTMLIFrameElement;
              iframe?.contentWindow?.print();
            }}
            style={{
              padding: "6px 16px",
              background: "white",
              color: "#1a365d",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Print / Save PDF
          </button>
          <a
            href={`${reportUrl}&format=json`}
            target="_blank"
            style={{
              padding: "6px 16px",
              background: "transparent",
              color: "white",
              border: "1px solid white",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "13px",
            }}
          >
            View JSON
          </a>
        </div>
      </div>

      {/* Report iframe */}
      <iframe
        id="report-frame"
        src={reportUrl}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: "white",
        }}
        title="Evalent Report"
      />
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "40px", textAlign: "center" }}>
          Loading report...
        </div>
      }
    >
      <ReportViewer />
    </Suspense>
  );
}
