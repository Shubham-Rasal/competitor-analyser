import { NextResponse } from 'next/server';
import { getReportByRunId } from '@/lib/db';
import { logAndSanitizeError } from '@/lib/safe-errors';

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { runId } = await params;

    if (!/^cmp_\d+_[a-z0-9]{9}$/.test(runId)) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    const report = await getReportByRunId(runId);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Progress: siteInfo 10%, rawCompetitorList 20%, competitorData 25%, competitorAnalysis 20%, reportData 25%
    let progress = 0;
    if (report.siteInfo) progress += 10;
    if (report.rawCompetitorList) progress += 20;
    if (report.competitorData) progress += 25;
    if (report.competitorAnalysis) progress += 20;
    if (report.reportData) progress += 25;

    if (report.status === 'completed') {
      progress = 100;
    }

    return NextResponse.json({
      status: report.status,
      progress,
      url: report.url,
      focus: report.focus,
      completedSteps: {
        siteInfo: !!report.siteInfo,
        rawCompetitorList: !!report.rawCompetitorList,
        competitorData: !!report.competitorData,
        competitorAnalysis: !!report.competitorAnalysis,
        reportData: !!report.reportData,
      },
    });
  } catch (error) {
    const safeError = logAndSanitizeError(error, 'status-fetch');
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
