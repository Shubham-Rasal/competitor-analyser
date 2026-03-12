import { NextResponse } from 'next/server';
import { getReportsByUserId } from '@/lib/db';
import { logAndSanitizeError } from '@/lib/safe-errors';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : 50;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : 0;

    console.log('[API] Fetching competitor reports for user:', userId, { limit, offset });

    const { reports, total, hasMore } = await getReportsByUserId(userId, { limit, offset });

    return NextResponse.json({
      success: true,
      reports: reports.map((report) => ({
        runId: report.runId,
        url: report.url,
        focus: report.focus,
        status: report.status,
        createdAt: report.createdAt,
      })),
      total,
      hasMore,
      pagination: {
        limit,
        offset,
        showing: reports.length,
      },
    });
  } catch (error) {
    const safeError = logAndSanitizeError(error, 'user-reports-fetch');
    return NextResponse.json(
      { success: false, error: safeError },
      { status: 500 }
    );
  }
}
