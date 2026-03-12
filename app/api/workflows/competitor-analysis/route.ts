import { start } from 'workflow/api';
import { NextResponse } from 'next/server';
import { competitorAnalysisWorkflow } from './workflow';
import { saveReport } from '@/lib/db';
import { COST_CONFIG } from '@/lib/config';
import {
  createPaymentRequirements,
  verifyPayment,
  settlePayment,
  create402Response,
  encodePaymentRequired,
} from '@/lib/payment-verification';
import { logAndSanitizeError } from '@/lib/safe-errors';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    // Internal A2A bypass — skip x402 payment if called by another agent
    const internalKey = request.headers.get('X-Internal-Agent-Key');
    const isInternalCall =
      internalKey &&
      process.env.INTERNAL_AGENT_KEY &&
      internalKey === process.env.INTERNAL_AGENT_KEY;

    if (!isInternalCall) {
      const paymentHeaderV2 = request.headers.get('PAYMENT-SIGNATURE');
      const paymentHeaderV1 = request.headers.get('X-PAYMENT');
      const paymentHeader = paymentHeaderV2 || paymentHeaderV1;

      const requestUrl = `${new URL(request.url).origin}${new URL(request.url).pathname}`;

      const paymentRequirements = createPaymentRequirements(
        `$${COST_CONFIG.competitorAnalysis}`,
        'base-sepolia',
        requestUrl,
        'Competitor Analyser - Discover and analyse your top competitors'
      );

      const verificationResult = await verifyPayment(paymentHeader, paymentRequirements);

      if (!verificationResult.isValid) {
        console.log('[API] Payment required - returning 402');
        const paymentRequiredHeader = encodePaymentRequired(paymentRequirements);
        return NextResponse.json(
          create402Response(paymentRequirements, verificationResult.error, verificationResult.payer),
          {
            status: 402,
            headers: { 'PAYMENT-REQUIRED': paymentRequiredHeader },
          }
        );
      }

      console.log('[API] ✓ Payment verified from:', verificationResult.payer);

      settlePayment(paymentHeader!, paymentRequirements).then(async (result) => {
        if (result.success) {
          console.log('[API] ✓ Payment settled:', result.txHash);
          // Record revenue on AgentEconomyRegistry (non-blocking)
          if (process.env.ERC8004_AGENT_ID && process.env.AGENT_PRIVATE_KEY && process.env.AGENT_ECONOMY_REGISTRY_ADDRESS) {
            try {
              const { createWalletClient, http, parseAbi } = await import('viem');
              const { filecoinCalibration } = await import('viem/chains');
              const { privateKeyToAccount } = await import('viem/accounts');
              const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
              const wc = createWalletClient({
                account,
                chain: filecoinCalibration,
                transport: http(process.env.FILECOIN_CALIBRATION_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'),
              });
              const usdCents = Math.max(1, Math.round(COST_CONFIG.competitorAnalysis * 100));
              await wc.writeContract({
                address: process.env.AGENT_ECONOMY_REGISTRY_ADDRESS as `0x${string}`,
                abi: parseAbi(['function recordRevenue(uint256 agentId, uint256 usdCents)']),
                functionName: 'recordRevenue',
                args: [BigInt(process.env.ERC8004_AGENT_ID), BigInt(usdCents)],
              });
              console.log('[API] ✓ Revenue recorded:', usdCents, 'cents');
            } catch (e) {
              console.error('[API] Revenue recording failed (non-fatal):', e);
            }
          }
        } else {
          console.error('[API] ✗ Payment settlement failed:', result.error);
        }
      });
    } else {
      console.log('[API] Internal A2A call — skipping x402 payment');
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    const body = await request.json();
    const { url, focus, userId: rawUserId } = body;

    if (!url || typeof url !== 'string' || url.trim().length < 4 || url.trim().length > 500) {
      return NextResponse.json({ error: 'URL is required (4-500 characters)' }, { status: 400 });
    }

    if (!focus || typeof focus !== 'string' || focus.trim().length < 2 || focus.trim().length > 200) {
      return NextResponse.json({ error: 'Focus is required (2-200 characters), e.g. "pricing" or "features"' }, { status: 400 });
    }

    const userId: string = isInternalCall
      ? (typeof rawUserId === 'string' ? rawUserId : 'agent:internal')
      : rawUserId;

    if (!isInternalCall && (!userId || typeof userId !== 'string')) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Sanitise and normalise URL
    const rawUrl = url.replace(/<[^>]*>/g, '').trim();
    let sanitizedUrl: string;
    try {
      const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      sanitizedUrl = parsed.toString();
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const sanitizedFocus = focus.replace(/<[^>]*>/g, '').trim();
    const sanitizedUserId = (userId || '').replace(/<[^>]*>/g, '').trim();

    const runId = `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await saveReport({
      runId,
      userId: sanitizedUserId,
      url: sanitizedUrl,
      focus: sanitizedFocus,
      createdAt: new Date(),
      status: 'analyzing',
    });

    console.log('[API] Starting competitor analysis workflow');
    const run = await start(competitorAnalysisWorkflow, [
      {
        runId,
        url: sanitizedUrl,
        focus: sanitizedFocus,
      },
    ]);

    console.log('[API] ✓ Workflow started:', run.runId);

    return NextResponse.json({
      success: true,
      runId,
      message: 'Competitor analysis started',
    });
  } catch (error) {
    const safeError = logAndSanitizeError(error, 'workflow-start');
    return NextResponse.json({ success: false, error: safeError }, { status: 500 });
  }
}
