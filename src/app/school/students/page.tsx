"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function HowToReadModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "32px",
          maxWidth: "640px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          color: "#1e293b",
          lineHeight: 1.65,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#1a365d",
              margin: 0,
            }}
          >
            How to Read This Report
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "22px",
              cursor: "pointer",
              color: "#64748b",
              padding: "4px 8px",
            }}
          >
            &times;
          </button>
        </div>
        <p style={{ marginBottom: "14px", fontSize: "14px" }}>
          This Evalent admissions report is designed to give you a clear,
          balanced picture of the student&apos;s readiness for the next stage of
          schooling. It combines timed multiple-choice questions in English,
          Mathematics and Reasoning with extended writing tasks and a short
          mindset and values inventory. Scores are criterion-referenced against
          entrance thresholds set by your school, not against a national norm
          group.
        </p>
        <p style={{ marginBottom: "14px", fontSize: "14px" }}>
          The extended writing tasks are evaluated using analytic rubrics that
          consider both content (relevance, depth of reasoning, use of examples)
          and writing quality (organisation, sentence control, vocabulary and
          technical accuracy). Domain-specific comments are intended to be read
          qualitatively rather than as &ldquo;pass/fail&rdquo; judgements.
        </p>
        <p style={{ marginBottom: "14px", fontSize: "14px" }}>
          The &ldquo;lens&rdquo; elements &mdash; Creativity, Values and Mindset
          &mdash; should be treated as complementary context rather than as
          gatekeepers. The overall recommendation band is generated using a
          consistent set of rules that combine domain scores, your school&apos;s
          thresholds, writing outcomes and mindset indicators. It is meant to
          guide, not replace, professional judgement.
        </p>
        <p style={{ marginBottom: "0", fontSize: "14px" }}>
          In practice, this report will be most powerful when interpreted
          alongside school reports, teacher references, interview impressions and
          knowledge of the student&apos;s previous schooling and language profile.
        </p>
      </div>
    </div>
  );
}

function ReportViewer() {
  const params = useSearchParams();
  const submissionId = params.get("id");
  const [showGuide, setShowGuide] = useState(false);

  if (!submissionId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "Arial" }}>
        <h1>Evalent Report Viewer</h1>
        <p>No submission ID provided. Add ?id=xxx to the URL.</p>
      </div>
    );
  }

  const reportUrl = "/api/report?submission_id=" + submissionId;

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
        <span style={{ fontWeight: "bold", fontSize: "14px" }}>
          Evalent Report Preview
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowGuide(true)}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "white",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            &#9432; How to Read
          </button>
          <button
            onClick={() => {
              var iframe = document.getElementById(
                "report-frame"
              ) as HTMLIFrameElement;
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.print();
              }
            }}
            style={{
              padding: "6px 16px",
              background: "white",
              color: "#1a365d",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            Print / Save PDF
          </button>
          <a
            href={reportUrl + "&format=json"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "white",
              border: "1px solid rgba(255,255,255,0.5)",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
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
          background: "#e2e8f0",
        }}
        title="Evalent Report"
      />

      {/* Guide Modal */}
      {showGuide && <HowToReadModal onClose={() => setShowGuide(false)} />}
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
