'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { getCurrentUser, toViemAccount } from '@coinbase/cdp-core';
import { FileText, Calendar, ArrowRight, Home } from 'lucide-react';

interface Report {
  runId: string;
  url: string;
  focus: string;
  status: 'analyzing' | 'completed' | 'failed';
  createdAt: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const { isSignedIn } = useIsSignedIn();
  const router = useRouter();

  useEffect(() => {
    async function fetchReports() {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        const walletAddress = user?.evmSmartAccounts?.[0]
          ? (await toViemAccount(user.evmSmartAccounts[0])).address
          : null;

        if (!walletAddress) {
          setError('Could not get wallet address');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/reports/user?userId=${walletAddress}&limit=8&offset=0`);
        const data = await response.json();

        if (data.success) {
          setReports(data.reports);
          setHasMore(data.hasMore);
          setTotal(data.total);
        } else {
          setError(data.error || 'Failed to fetch reports');
        }
      } catch (err) {
        console.error('[Reports] Error:', err);
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [isSignedIn]);

  const loadMoreReports = async () => {
    if (!isSignedIn || loadingMore) return;

    setLoadingMore(true);
    try {
      const user = await getCurrentUser();
      const walletAddress = user?.evmSmartAccounts?.[0]
        ? (await toViemAccount(user.evmSmartAccounts[0])).address
        : null;

      if (!walletAddress) return;

      const offset = reports.length;
      const response = await fetch(`/api/reports/user?userId=${walletAddress}&limit=8&offset=${offset}`);
      const data = await response.json();

      if (data.success) {
        setReports((prev) => [...prev, ...data.reports]);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('[Reports] Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-6" style={{ color: '#666666' }} />
          <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#FFFFFF' }}>Sign In Required</h1>
          <p className="text-base md:text-lg mb-8" style={{ color: '#888888' }}>Please sign in to view your report history</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
            <Home className="w-4 h-4" /> Go Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#FFFFFF' }}></div>
          <p style={{ color: '#888888' }}>Loading your reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <p className="text-base md:text-lg mb-8" style={{ color: '#EF4444' }}>{error}</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
            <Home className="w-4 h-4" /> Go Home
          </button>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-6" style={{ color: '#666666' }} />
          <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#FFFFFF' }}>No Reports Yet</h1>
          <p className="text-base md:text-lg mb-8" style={{ color: '#888888' }}>You haven't run any competitor analyses yet</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
            <Home className="w-4 h-4" /> Analyse Competitors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-28 md:pt-16 pb-16">
        <div className="mb-10 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Your Competitor Reports</h1>
          <p className="text-sm md:text-base" style={{ color: '#888888' }}>
            {total > 0 ? `Showing ${reports.length} of ${total} reports` : 'View your previous analyses'}
          </p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {reports.map((report) => (
            <div
              key={report.runId}
              onClick={() => router.push(`/report/${report.runId}`)}
              className="rounded-xl p-4 md:p-6 border transition-all cursor-pointer hover:border-[#444444]"
              style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}
            >
              <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-3 md:mb-2">
                    <h3 className="text-base md:text-xl font-semibold truncate" style={{ color: '#FFFFFF' }}>{report.url}</h3>
                    {report.status === 'completed' && (
                      <span className="px-2 py-1 rounded text-xs font-medium w-fit" style={{ backgroundColor: '#1E3A1E', color: '#4ADE80' }}>Completed</span>
                    )}
                    {report.status === 'analyzing' && (
                      <span className="px-2 py-1 rounded text-xs font-medium w-fit" style={{ backgroundColor: '#3A3A1A', color: '#EAB308' }}>Analyzing</span>
                    )}
                    {report.status === 'failed' && (
                      <span className="px-2 py-1 rounded text-xs font-medium w-fit" style={{ backgroundColor: '#3A1A1A', color: '#EF4444' }}>Failed</span>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-3">
                    <span className="text-xs md:text-sm" style={{ color: '#888888' }}>Focus: {report.focus}</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#666666' }} />
                      <span className="text-xs md:text-sm" style={{ color: '#888888' }}>{formatDate(report.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: '#666666' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 md:mt-12 flex flex-col items-center gap-4 px-4">
          {hasMore && (
            <button
              onClick={loadMoreReports}
              disabled={loadingMore}
              className="w-full md:w-auto px-8 py-3 rounded-lg font-medium transition-all text-sm md:text-base"
              style={{ backgroundColor: loadingMore ? '#3A3A3A' : '#FFFFFF', color: loadingMore ? '#888888' : '#000000' }}
            >
              {loadingMore ? 'Loading...' : 'Load More Reports'}
            </button>
          )}
          <button onClick={() => router.push('/')} className="w-full md:w-auto px-6 py-3 rounded-lg font-medium" style={{ backgroundColor: '#2A2A2A', color: '#FFFFFF' }}>
            New Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
