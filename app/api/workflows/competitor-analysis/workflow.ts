// Competitor Analysis Workflow — mock mode, completes in ~5s

async function mockCompetitorStep(url: string, focus: string, runId: string) {
  "use step";

  const { updateReport } = await import('@/lib/db');

  console.log('[Workflow] MOCK MODE: Generating dummy competitor data in ~2s');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const domain = (() => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  })();

  const competitors = [
    {
      name: 'Competitor Alpha',
      website: 'https://alpha-competitor.example.com',
      description: `A leading player in the same space as ${domain}, known for strong ${focus} execution.`,
      strengths: [`Strong ${focus} offering`, 'Large existing customer base', 'Well-funded'],
      weaknesses: ['Higher price point', 'Complex onboarding', 'Slow feature iteration'],
      relevanceScore: 91,
    },
    {
      name: 'Beta Solutions',
      website: 'https://beta-solutions.example.com',
      description: `Mid-market competitor with a focus on SMBs. Competes on ${focus} with a simplified product.`,
      strengths: ['Affordable pricing', 'Ease of use', 'Good support'],
      weaknesses: ['Limited enterprise features', 'Smaller ecosystem', 'Weaker analytics'],
      relevanceScore: 78,
    },
    {
      name: 'Gamma Platform',
      website: 'https://gamma-platform.example.com',
      description: `New entrant disrupting the market with a modern approach to ${focus}.`,
      strengths: ['Modern UX', 'API-first design', 'Fast roadmap'],
      weaknesses: ['Limited track record', 'Smaller support team', 'Fewer integrations'],
      relevanceScore: 71,
    },
    {
      name: 'Delta Corp',
      website: 'https://delta-corp.example.com',
      description: `Enterprise-focused competitor. Strong in compliance and security, weaker on ${focus}.`,
      strengths: ['Enterprise compliance', 'Global scale', 'Brand trust'],
      weaknesses: ['Outdated UI', 'Slow innovation', 'High implementation cost'],
      relevanceScore: 65,
    },
    {
      name: 'Epsilon Tools',
      website: 'https://epsilon-tools.example.com',
      description: `Niche player specialising in ${focus} for specific verticals. High NPS, low market share.`,
      strengths: [`Deep ${focus} expertise`, 'High customer loyalty', 'Vertical-specific features'],
      weaknesses: ['Narrow market focus', 'Limited growth potential', 'Small team'],
      relevanceScore: 58,
    },
  ];

  const swotAnalysis = {
    strengths: [
      `${domain} has a differentiated approach to ${focus}`,
      'Agile team capable of rapid iteration',
      'Strong product–market fit signal from early users',
    ],
    weaknesses: [
      'Lower brand recognition than established players',
      'Limited marketing budget',
      'Smaller feature set vs. mature competitors',
    ],
    opportunities: [
      `Growing demand for better ${focus} solutions`,
      'Competitors have high churn due to complexity',
      'Underserved SMB segment with willingness to pay',
    ],
    threats: [
      'Well-funded incumbents could copy key features',
      'Market consolidation via M&A',
      'Rapid commoditisation of core features',
    ],
  };

  const dummyReportData = {
    runId,
    generatedAt: new Date().toISOString(),
    isMock: true,
    url,
    focus,
    executiveSummary: `Competitor analysis for ${domain} focused on "${focus}" reveals 5 key competitors. Competitor Alpha (score: 91) is the strongest threat. Your key opportunity: incumbent complexity creates a clear wedge for a simpler, faster ${focus} experience.`,
    userSiteOverview: `${domain} is an emerging product in its space. Based on the domain and focus area "${focus}", the product appears to target users looking for a modern, streamlined alternative to legacy tools.`,
    competitors,
    swotAnalysis,
    strategicRecommendations: [
      { area: focus.charAt(0).toUpperCase() + focus.slice(1), recommendation: `Double down on ${focus} as the core differentiator. Ensure every release ships a visible ${focus} improvement.`, priority: 1 },
      { area: 'Pricing', recommendation: 'Position below Competitor Alpha with a transparent, usage-based model to capture cost-conscious switchers.', priority: 2 },
      { area: 'Content & SEO', recommendation: `Publish comparison content targeting "[competitor] alternative" keywords to capture high-intent traffic from Beta Solutions and Delta Corp users.`, priority: 3 },
      { area: 'Onboarding', recommendation: 'Reduce time-to-value to under 5 minutes — this is the #1 weakness of top competitors.', priority: 4 },
      { area: 'Integrations', recommendation: 'Prioritise integrations with the top 5 tools your competitors lack to grow through ecosystem adjacency.', priority: 5 },
    ],
  };

  await updateReport(runId, {
    siteInfo: { title: domain, description: `Analysis target: ${url}` },
    rawCompetitorList: competitors.map(c => ({ name: c.name, url: c.website })),
    competitorData: competitors,
    competitorAnalysis: competitors,
    reportData: dummyReportData,
  });

  console.log('[Workflow] MOCK MODE: Dummy competitor data written to DB');
  return dummyReportData;
}

async function finalizeStep(runId: string) {
  "use step";
  const { updateReport, getReportByRunId } = await import('@/lib/db');
  console.log('[Workflow] Finalizing');
  await updateReport(runId, { status: 'completed' });

  // — FOC storage (non-blocking, errors are caught and logged) —
  if (process.env.ERC8004_AGENT_ID) {
    try {
      const report = await getReportByRunId(runId);
      const { storeCompletedReport } = await import('@/lib/foc-storage');
      const stored = await storeCompletedReport(
        runId,
        (report as any)?.reportData,
        parseInt(process.env.ERC8004_AGENT_ID!, 10)
      );
      await updateReport(runId, { focCid: stored.cid, focListingId: stored.listingId });
      console.log('[Workflow] FOC stored:', stored.cid);
    } catch (e) {
      console.error('[Workflow] FOC storage failed (non-fatal):', e);
    }
  }

  console.log('[Workflow] ✓ Competitor analysis completed');
  return { success: true };
}

export const competitorAnalysisWorkflow = async (input: {
  runId: string;
  url: string;
  focus: string;
}) => {
  "use workflow";

  const { runId, url, focus } = input;

  const reportData = await mockCompetitorStep(url, focus, runId);
  await finalizeStep(runId);

  return { success: true, runId, reportData };
};
