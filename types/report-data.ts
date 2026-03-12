// Structured competitor report data

export interface CompetitorProfile {
  name: string;
  website: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  relevanceScore: number; // 0-100, how competitive they are
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface StrategicRecommendation {
  area: string; // e.g. "Pricing", "Content Strategy", "Feature Differentiation"
  recommendation: string;
  priority: number; // 1 = highest
}

export interface StructuredCompetitorReportData {
  executiveSummary: string;
  userSiteOverview: string;
  competitors: CompetitorProfile[];
  swotAnalysis: SWOTAnalysis;
  strategicRecommendations: StrategicRecommendation[];
}
