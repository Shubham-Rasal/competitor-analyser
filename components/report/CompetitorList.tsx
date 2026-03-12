'use client';

import type { CompetitorProfile } from '@/types/report-data';

interface CompetitorListProps {
  competitors: CompetitorProfile[];
}

export function CompetitorList({ competitors }: CompetitorListProps) {
  if (!competitors || competitors.length === 0) return null;

  return (
    <div className="rounded-2xl border p-6" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>Top Competitors</h2>
      <div className="space-y-4">
        {competitors.map((competitor, i) => (
          <div key={i} className="rounded-xl border p-5" style={{ backgroundColor: '#111111', borderColor: '#2A2A2A' }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#2A2A2A', color: '#888888' }}>
                    #{i + 1}
                  </span>
                  <h3 className="font-semibold text-base" style={{ color: '#FFFFFF' }}>{competitor.name}</h3>
                </div>
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline"
                  style={{ color: '#888888' }}
                >
                  {competitor.website}
                </a>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#666666' }}>Threat</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: competitor.relevanceScore >= 80 ? '#EF4444' : competitor.relevanceScore >= 60 ? '#F59E0B' : '#22C55E' }}
                >
                  {competitor.relevanceScore}
                </p>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: '#AAAAAA' }}>{competitor.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#22C55E' }}>Strengths</p>
                <ul className="space-y-1">
                  {competitor.strengths.map((s, j) => (
                    <li key={j} className="text-xs flex items-start gap-2" style={{ color: '#888888' }}>
                      <span style={{ color: '#22C55E' }}>+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#EF4444' }}>Weaknesses</p>
                <ul className="space-y-1">
                  {competitor.weaknesses.map((w, j) => (
                    <li key={j} className="text-xs flex items-start gap-2" style={{ color: '#888888' }}>
                      <span style={{ color: '#EF4444' }}>−</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
