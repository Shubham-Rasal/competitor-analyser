'use client';

import { useEffect, useState } from 'react';
import { WorkflowProgressBar } from './WorkflowProgressBar';
import { WorkflowStepTimeline } from './WorkflowStepTimeline';
import { CompetitorReport } from './report/CompetitorReport';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DownloadReportButton } from './DownloadReportButton';
import type { StructuredCompetitorReportData } from '@/types/report-data';

interface StepUpdate {
  stepId: string;
  stepLabel: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp: number;
  duration?: number;
  error?: string;
  subStep?: string;
}

interface WorkflowStatusClientProps {
  runId: string;
  initialData: {
    status: string;
    progress: number;
    url: string;
    focus: string;
    completedSteps: Record<string, boolean>;
  };
}

export function WorkflowStatusClient({ runId, initialData }: WorkflowStatusClientProps) {
  const [status, setStatus] = useState(initialData.status);
  const [progress, setProgress] = useState(initialData.progress);
  const [steps, setSteps] = useState<StepUpdate[]>([
    { stepId: 'site-info', stepLabel: 'Analysing your site', status: initialData.completedSteps.siteInfo ? 'success' : 'pending', timestamp: Date.now() },
    { stepId: 'discover-competitors', stepLabel: 'Discovering competitors', status: initialData.completedSteps.rawCompetitorList ? 'success' : 'pending', timestamp: Date.now() },
    { stepId: 'fetch-competitor-data', stepLabel: 'Fetching competitor data', status: initialData.completedSteps.competitorData ? 'success' : 'pending', timestamp: Date.now() },
    { stepId: 'analyse-competitors', stepLabel: 'Analysing competitors', status: initialData.completedSteps.competitorAnalysis ? 'success' : 'pending', timestamp: Date.now() },
    { stepId: 'generate-report', stepLabel: 'Generating report', status: initialData.completedSteps.reportData ? 'success' : 'pending', timestamp: Date.now() },
  ]);
  const [reportData, setReportData] = useState<StructuredCompetitorReportData | null>(null);
  const [url, setUrl] = useState(initialData.url);
  const [focus, setFocus] = useState(initialData.focus);
  const [showSteps, setShowSteps] = useState(false);
  const stepStartTimes = useState<Map<string, number>>(new Map())[0];

  useEffect(() => {
    if (status === 'completed' && !reportData) {
      fetch(`/api/report/${runId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.reportData) {
            setReportData(data.reportData);
          }
        })
        .catch((err) => console.error('Failed to fetch report:', err));
    }
  }, [runId, status, reportData]);

  useEffect(() => {
    if (status === 'completed' || status === 'failed' || status === 'error') {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/report/${runId}/status`);
        const data = await response.json();

        setStatus(data.status);
        setProgress(data.progress);
        setUrl(data.url || url);
        setFocus(data.focus || focus);

        setSteps((prev) => {
          const stepCompletionMap: Record<string, string> = {
            'site-info': 'siteInfo',
            'discover-competitors': 'rawCompetitorList',
            'fetch-competitor-data': 'competitorData',
            'analyse-competitors': 'competitorAnalysis',
            'generate-report': 'reportData',
          };

          let updated = prev.map((step) => {
            const completionKey = stepCompletionMap[step.stepId];
            const newStatus =
              completionKey && data.completedSteps[completionKey] && step.status !== 'success'
                ? 'success'
                : step.status;
            const startTime = stepStartTimes.get(step.stepId) || step.timestamp;
            const duration = newStatus === 'success' ? Date.now() - startTime : step.duration;
            return { ...step, status: newStatus, duration };
          });

          const firstPendingIndex = updated.findIndex((s) => s.status !== 'success');

          updated = updated.map((step, index) => {
            if (step.status === 'success' || step.status === 'error') return step;
            const isRunning = index === firstPendingIndex;
            if (isRunning && !stepStartTimes.has(step.stepId)) {
              stepStartTimes.set(step.stepId, Date.now());
            }
            const subStepMap: Record<string, string> = {
              'site-info': 'Scanning your website...',
              'discover-competitors': 'Searching for competitors...',
              'fetch-competitor-data': 'Scraping competitor sites...',
              'analyse-competitors': 'Scoring and ranking threats...',
              'generate-report': 'Assembling SWOT and recommendations...',
            };
            return {
              ...step,
              status: isRunning ? 'running' : 'pending',
              subStep: isRunning ? subStepMap[step.stepId] : undefined,
            };
          });

          return updated;
        });

        if (data.status === 'completed') {
          const reportResponse = await fetch(`/api/report/${runId}`);
          const reportResponseData = await reportResponse.json();
          if (reportResponseData.reportData) {
            setReportData(reportResponseData.reportData);
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [runId, status, url, focus, stepStartTimes]);

  if (status === 'failed' || status === 'error') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#111111' }}>
        <div className="max-w-2xl mx-auto px-6 pt-28 md:pt-16 pb-16">
          <div className="rounded-2xl border p-8" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full" style={{ backgroundColor: '#222222' }}>
                <XCircle className="w-8 h-8" style={{ color: '#666666' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Analysis Failed</h1>
                <p style={{ color: '#888888' }}>Something went wrong during the analysis</p>
              </div>
            </div>
            <WorkflowStepTimeline steps={steps} />
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => (window.location.href = '/')}
                className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors"
                style={{ backgroundColor: '#222222', color: '#FFFFFF' }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'completed' && reportData) {
    const completedCount = steps.filter((s) => s.status === 'success').length;
    const totalDuration = steps.filter((s) => s.duration).reduce((sum, s) => sum + (s.duration || 0), 0);

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#222222' }}>
        <div className="max-w-6xl mx-auto px-6 pt-28 md:pt-12 pb-12">
          <div className="mb-12 no-print">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#1A3A1A', border: '2px solid #22C55E' }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: '#22C55E' }} />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2" style={{ color: '#FFFFFF' }}>Analysis Complete</h1>
                <p className="text-lg" style={{ color: '#888888' }}>{url}</p>
                <p className="text-sm" style={{ color: '#666666' }}>Focus: {focus}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-6 pt-6 border-t" style={{ borderColor: '#2A2A2A' }}>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#666666' }}>Steps Completed</p>
                <p className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>{completedCount}/{steps.length}</p>
              </div>
              {totalDuration > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#666666' }}>Total Time</p>
                  <p className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>{(totalDuration / 1000).toFixed(0)}s</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-full text-left"
                style={{ backgroundColor: showSteps ? '#222222' : 'transparent', color: '#888888' }}
              >
                {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="text-sm font-medium">Workflow Steps</span>
                <span className="ml-auto text-xs" style={{ color: '#666666' }}>{completedCount} completed</span>
              </button>
              {showSteps && (
                <div className="mt-4 pl-2">
                  <WorkflowStepTimeline steps={steps} />
                </div>
              )}
            </div>

            <div className="mt-8">
              <DownloadReportButton reportData={reportData} userUrl={url} runId={runId} />
            </div>
          </div>

          <CompetitorReport data={reportData} />
        </div>
      </div>
    );
  }

  const currentStep = steps.find((s) => s.status === 'running');
  const currentSubStepText = currentStep?.subStep;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      <div className="max-w-4xl mx-auto px-6 pt-32 md:pt-24 pb-16">
        <div className="rounded-2xl border p-8" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: '#FFFFFF' }}>
            Analysing Competitors
          </h1>
          <p className="mb-8 text-center" style={{ color: '#888888' }}>
            {url} — {focus}
          </p>

          <WorkflowProgressBar
            progress={progress}
            currentStep={currentStep?.stepLabel || 'Processing...'}
            totalSteps={steps.length}
            completedSteps={steps.filter((s) => s.status === 'success').length}
            subStep={currentSubStepText}
          />

          <div className="mt-8">
            <WorkflowStepTimeline steps={steps} />
          </div>

          <p className="text-sm text-center mt-8" style={{ color: '#555555' }}>
            This usually takes less than 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
