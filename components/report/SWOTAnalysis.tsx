'use client';

import type { SWOTAnalysis as SWOTData } from '@/types/report-data';

interface SWOTAnalysisProps {
  swot: SWOTData;
}

const quadrants = [
  { key: 'strengths' as const, label: 'Strengths', color: '#22C55E', bg: '#0D2B0D' },
  { key: 'weaknesses' as const, label: 'Weaknesses', color: '#EF4444', bg: '#2B0D0D' },
  { key: 'opportunities' as const, label: 'Opportunities', color: '#3B82F6', bg: '#0D1B2B' },
  { key: 'threats' as const, label: 'Threats', color: '#F59E0B', bg: '#2B1F0D' },
];

export function SWOTAnalysis({ swot }: SWOTAnalysisProps) {
  if (!swot) return null;

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>SWOT Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map(({ key, label, color, bg }) => (
          <div key={key} className="rounded-xl p-4 border" style={{ backgroundColor: bg, borderColor: color + '40' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color }}>
              {label}
            </p>
            <ul className="space-y-2">
              {(swot[key] ?? []).map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#CCCCCC' }}>
                  <span className="mt-0.5 flex-shrink-0 text-xs" style={{ color }}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
