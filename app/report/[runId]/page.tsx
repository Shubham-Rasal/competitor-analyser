import { getReportByRunId } from '@/lib/db';
import { notFound } from 'next/navigation';
import { WorkflowStatusClient } from '@/components/WorkflowStatusClient';

interface ReportPageProps {
  params: Promise<{ runId: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { runId } = await params;

  const report = await getReportByRunId(runId);

  if (!report) {
    notFound();
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

  const initialData = {
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
  };

  return <WorkflowStatusClient runId={runId} initialData={initialData} />;
}
