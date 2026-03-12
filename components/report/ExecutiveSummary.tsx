'use client';

interface ExecutiveSummaryProps {
  overview: string;
}

export function ExecutiveSummary({ overview }: ExecutiveSummaryProps) {
  return (
    <div className="rounded-2xl p-8 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <h2 className="text-3xl font-bold mb-3" style={{ color: '#FFFFFF' }}>Executive Summary</h2>
      <p className="text-lg leading-relaxed" style={{ color: '#CCCCCC' }}>{overview}</p>
    </div>
  );
}
