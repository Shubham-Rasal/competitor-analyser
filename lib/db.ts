import clientPromise from './mongodb';
import type { CompetitorReport } from '@/types';

const DB_NAME = 'competitor-analyser';
const COLLECTION_NAME = 'competitor_reports';

export async function saveReport(report: CompetitorReport): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<CompetitorReport>(COLLECTION_NAME);

  await collection.insertOne(report);
}

export async function getReportByRunId(runId: string): Promise<CompetitorReport | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<CompetitorReport>(COLLECTION_NAME);

  const report = await collection.findOne({ runId });
  return report;
}

export async function updateReportStatus(
  runId: string,
  status: 'analyzing' | 'completed' | 'failed',
  data?: Partial<CompetitorReport>
): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<CompetitorReport>(COLLECTION_NAME);

  await collection.updateOne(
    { runId },
    { $set: { status, ...data } }
  );
}

export async function updateReport(runId: string, data: Partial<CompetitorReport>): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<CompetitorReport>(COLLECTION_NAME);

  await collection.updateOne(
    { runId },
    { $set: data }
  );
}

export async function getUserReports(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ reports: CompetitorReport[]; total: number; hasMore: boolean }> {
  const limit = Math.min(options.limit || 50, 100);
  const offset = options.offset || 0;

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection<CompetitorReport>(COLLECTION_NAME);

  const [reports, total] = await Promise.all([
    collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments({ userId }),
  ]);

  return {
    reports,
    total,
    hasMore: offset + reports.length < total,
  };
}

export const getReportsByUserId = getUserReports;
