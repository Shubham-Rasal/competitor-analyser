import { NextResponse } from 'next/server';
import { COST_CONFIG } from '@/lib/config';

/**
 * ERC-8004 Agent Card (AgentURI metadata)
 * Served at /.well-known/agent-card.json for agent discovery
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://competitor-analyser.vercel.app';
  const receivingWallet = process.env.USDC_RECEIVING_WALLET_ADDRESS;
  const agentId = process.env.ERC8004_AGENT_ID;
  const agentRegistry = process.env.ERC8004_AGENT_REGISTRY;

  const agentCard = {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: 'Competitor Analyser Agent',
    description:
      'AI-powered competitor intelligence. Accepts your website URL and a focus area (e.g. "pricing", "features", "content"), then discovers and analyses your top competitors. Returns a structured report with SWOT analysis and strategic recommendations. Payment-gated via x402 (USDC on Base Sepolia).',
    image: `${baseUrl}/logo.png`,
    active: true,
    x402Support: true,
    healthUrl: `${baseUrl}/api/health`,

    services: [
      {
        name: 'api',
        version: '1.0.0',
        endpoint: `${baseUrl}/api/workflows/competitor-analysis`,
        description: 'Run competitor analysis. POST with { url, focus, userId }. Returns runId. Poll /api/report/{runId}/status for progress.',
        protocol: 'http',
        type: 'x402',
        cost: COST_CONFIG.competitorAnalysis.toString(),
        currency: 'USDC',
        network: 'eip155:84532',
        payment: {
          required: true,
          protocol: 'x402',
          network: 'eip155:84532',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: COST_CONFIG.competitorAnalysis.toString(),
          currency: 'USDC',
        },
        inputSchema: {
          type: 'object',
          required: ['url', 'focus', 'userId'],
          properties: {
            url: { type: 'string', description: 'Your website URL to analyse' },
            focus: { type: 'string', description: 'Focus area for analysis, e.g. "pricing", "features", "content strategy"' },
            userId: { type: 'string', description: 'Wallet address (CAIP-10 or 0x...)' },
          },
        },
        requestSchema: {
          method: 'POST',
          contentType: 'application/json',
          body: {
            url: 'string (required) - Your website URL',
            focus: 'string (required) - Focus area, e.g. pricing or features',
            userId: 'string (required) - Wallet address',
          },
        },
        responseSchema: {
          success: 'boolean',
          runId: 'string - Use for status and report fetch',
          message: 'string',
        },
      },
      {
        name: 'status',
        version: '1.0.0',
        endpoint: `${baseUrl}/api/report/{runId}/status`,
        description: 'Poll workflow progress. GET returns { status, progress, completedSteps }.',
      },
      {
        name: 'report',
        version: '1.0.0',
        endpoint: `${baseUrl}/api/report/{runId}`,
        description: 'Fetch completed report. GET returns full report data when status is completed.',
      },
      ...(receivingWallet
        ? [
            {
              name: 'agentWallet',
              endpoint: `eip155:84532:${receivingWallet}`,
            },
          ]
        : []),
    ],

    ...(agentId && agentRegistry
      ? {
          registrations: [
            {
              agentId: parseInt(agentId, 10),
              agentRegistry,
            },
          ],
        }
      : {}),

    supportedTrust: ['reputation', 'crypto-economic'],
  };

  return NextResponse.json(agentCard, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
