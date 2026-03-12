import { NextResponse } from 'next/server';
import { getReportByRunId, updateReport } from '@/lib/db';
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

    return NextResponse.json({
      runId: report.runId,
      status: report.status,
      url: report.url,
      focus: report.focus,
      reportData: report.reportData,
      focCid: report.focCid,
      focListingId: report.focListingId,
      createdAt: report.createdAt,
    });
  } catch (error) {
    const safeError = logAndSanitizeError(error, 'report-fetch');
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { runId } = await params;

    if (!/^cmp_\d+_[a-z0-9]{9}$/.test(runId)) {
      return NextResponse.json({ error: 'Invalid report ID format' }, { status: 400 });
    }

    const body = await request.json();
    await updateReport(runId, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    const safeError = logAndSanitizeError(error, 'report-update');
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
