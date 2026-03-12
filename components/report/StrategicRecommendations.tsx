'use client';

import type { StrategicRecommendation } from '@/types/report-data';

interface StrategicRecommendationsProps {
  recommendations: StrategicRecommendation[];
}

export function StrategicRecommendations({ recommendations }: StrategicRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>Strategic Recommendations</h2>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border p-4" style={{ backgroundColor: '#111111', borderColor: '#2A2A2A' }}>
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: '#FFFFFF', color: '#000000' }}
            >
              {rec.priority}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#888888' }}>
                {rec.area}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#CCCCCC' }}>
                {rec.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
