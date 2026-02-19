/**
 * Resend Email Sender
 *
 * Sends emails via the Resend API.
 * Uses the Resend REST API directly (no SDK needed).
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[EMAIL] RESEND_API_KEY not set");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const from = options.from || "Evalent <reports@evalent.io>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[EMAIL] Resend error:", data);
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    console.log(`[EMAIL] Sent to ${options.to}, id: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error("[EMAIL] Send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
