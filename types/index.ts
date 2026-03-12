import { ObjectId } from 'mongodb';

export interface CompetitorReport {
  _id?: ObjectId;
  runId: string; // Unique workflow run ID (cmp_{timestamp}_{9-char-random})
  userId: string; // Wallet address
  url: string; // User's website to analyse
  focus: string; // e.g. "pricing", "features", "content strategy"
  createdAt: Date;
  status: 'analyzing' | 'completed' | 'failed';

  // Step 1: User site overview
  siteInfo?: {
    title?: string;
    description?: string;
  };

  // Step 2: Raw competitor list
  rawCompetitorList?: Array<{ name: string; url: string; description?: string }>;

  // Step 3: Competitor data from scraping
  competitorData?: Array<{
    name: string;
    website: string;
    description?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>;

  // Step 4: Ranked / analysed competitors
  competitorAnalysis?: import('./report-data').CompetitorProfile[];

  // Step 5: Final report data
  reportData?: import('./report-data').StructuredCompetitorReportData;

  // Payment tracking
  paymentTxHash?: string;
  paymentAmount?: number;

  // Filecoin / FOC storage
  focCid?: string;
  focListingId?: string | null;
}
