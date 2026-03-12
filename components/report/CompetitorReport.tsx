'use client';

import type { StructuredCompetitorReportData } from '@/types/report-data';
import { ExecutiveSummary } from './ExecutiveSummary';
import { CompetitorList } from './CompetitorList';
import { SWOTAnalysis } from './SWOTAnalysis';
import { StrategicRecommendations } from './StrategicRecommendations';

interface CompetitorReportProps {
  data: StructuredCompetitorReportData;
}

export function CompetitorReport({ data }: CompetitorReportProps) {
  return (
    <div className="space-y-8">
      <ExecutiveSummary overview={data.executiveSummary} />
      <CompetitorList competitors={data.competitors} />
      <SWOTAnalysis swot={data.swotAnalysis} />
      <StrategicRecommendations recommendations={data.strategicRecommendations} />
    </div>
  );
}
