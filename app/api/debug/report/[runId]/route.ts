import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
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

    const client = await clientPromise;
    const db = client.db('competitor-analyser');
    const collection = db.collection('competitor_reports');

    let report = await collection.findOne({ runId });

    if (!report) {
      report = await collection.findOne({}, { sort: { createdAt: -1 } });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      runId: report.runId,
      status: report.status,
      url: report.url,
      focus: report.focus,
      hasReportData: !!report.reportData,
      reportData: report.reportData || null,
      siteInfo: report.siteInfo || null,
      rawCompetitorList: report.rawCompetitorList || null,
      competitorData: report.competitorData || null,
      competitorAnalysis: report.competitorAnalysis || null,
    });
  } catch (error) {
    const safeError = logAndSanitizeError(error, 'debug-report-fetch');
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
