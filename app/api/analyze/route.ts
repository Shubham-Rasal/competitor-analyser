/**
 * POST /api/analyze?store=true|dry-run
 *
 * Thin wrapper around the main investor analysis workflow that adds optional
 * Filecoin Onchain Cloud storage. The core analysis is delegated to
 * /api/workflows/investor-analysis; this endpoint adds the FOC storage path
 * when ?store=true (or ?store=dry-run for testing).
 *
 * Requires the same x402 payment as the main workflow.
 *
 * Response includes `cid` when storage is performed.
 */

import { NextResponse } from "next/server";
import { storeAnalysis } from "@/lib/foc-storage";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const store = url.searchParams.get("store"); // "true" | "dry-run" | null
  const shouldStore = store === "true" || store === "dry-run";
  const dryRun = store === "dry-run";

  const body = await request.json().catch(() => ({}));
  const { companyName } = body as { companyName?: string };

  if (!companyName) {
    return NextResponse.json(
      { error: "companyName is required" },
      { status: 400 }
    );
  }

  // Forward to the main workflow endpoint (same origin)
  const origin = new URL(request.url).origin;
  const workflowUrl = `${origin}/api/workflows/competitor-analysis`;

  const paymentHeaders: Record<string, string> = {};
  const sig = request.headers.get("PAYMENT-SIGNATURE");
  const xpay = request.headers.get("X-PAYMENT");
  if (sig) paymentHeaders["PAYMENT-SIGNATURE"] = sig;
  if (xpay) paymentHeaders["X-PAYMENT"] = xpay;

  let workflowRes: Response;
  try {
    workflowRes = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...paymentHeaders,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach analysis workflow", details: String(err) },
      { status: 502 }
    );
  }

  if (!workflowRes.ok) {
    const responseBody = await workflowRes.text();
    return new NextResponse(responseBody, {
      status: workflowRes.status,
      headers: Object.fromEntries(workflowRes.headers.entries()),
    });
  }

  const workflowData = await workflowRes.json() as {
    success: boolean;
    runId?: string;
    [key: string]: unknown;
  };

  if (!shouldStore || !workflowData.success || !workflowData.runId) {
    return NextResponse.json(workflowData);
  }

  // Store the analysis result to FOC
  let cid: string | null = null;
  let focError: string | null = null;
  try {
    const analysisResult = {
      companyName,
      runId: workflowData.runId,
      generatedAt: new Date().toISOString(),
      summary: { runId: workflowData.runId, companyName },
    };
    const stored = await storeAnalysis(analysisResult, dryRun);
    cid = stored.cid;
  } catch (err) {
    focError = String(err);
    console.error("[analyze] FOC storage failed:", err);
  }

  return NextResponse.json({
    ...workflowData,
    foc: {
      stored: cid !== null,
      cid,
      dryRun,
      error: focError,
    },
  });
}
