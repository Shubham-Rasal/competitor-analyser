'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { getCurrentUser, toViemAccount } from '@coinbase/cdp-core';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { COST_CONFIG } from '@/lib/config';
import { AsciiBackground } from '@/components/AsciiBackground';

export default function Home() {
  const [url, setUrl] = useState('');
  const [focus, setFocus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [paymentFetch, setPaymentFetch] = useState<typeof fetch | null>(null);
  const router = useRouter();
  const { isSignedIn } = useIsSignedIn();

  useEffect(() => {
    async function setupPaymentFetch() {
      if (!isSignedIn) {
        setPaymentFetch(null);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user?.evmSmartAccounts?.[0]) return;

        const viemAccount = await toViemAccount(user.evmSmartAccounts[0]);
        const publicClient = createPublicClient({
          chain: baseSepolia,
          transport: http('https://sepolia.base.org'),
        });
        const signer = toClientEvmSigner(viemAccount, publicClient);

        const client = new x402Client().register('eip155:84532', new ExactEvmScheme(signer));
        const wrapped = wrapFetchWithPayment(fetch, client);
        setPaymentFetch(() => wrapped);
      } catch (error) {
        console.error('[Setup] Failed to create payment fetch:', error);
      }
    }

    setupPaymentFetch();
  }, [isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim() || url.trim().length < 4) {
      setError('Please enter your website URL');
      return;
    }

    if (!focus.trim() || focus.trim().length < 2) {
      setError('Please enter a focus area (e.g., pricing, features, content)');
      return;
    }

    if (!isSignedIn) {
      setError('Please sign in to continue');
      setTimeout(() => {
        const authButton = document.querySelector('[data-testid="cdp-auth-button"]') as HTMLButtonElement;
        if (authButton) authButton.click();
      }, 100);
      return;
    }

    if (!paymentFetch) {
      setError('Payment system is initializing. Please wait a moment and try again.');
      return;
    }

    setLoading(true);

    try {
      const user = await getCurrentUser();
      const walletAddress = user?.evmSmartAccounts?.[0]
        ? (await toViemAccount(user.evmSmartAccounts[0])).address
        : 'unknown';

      const rawUrl = url.trim();
      const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

      const response = await paymentFetch('/api/workflows/competitor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          focus: focus.trim(),
          userId: walletAddress,
        }),
      });

      if (response.status === 402) {
        try {
          const data = await response.json();
          if (data.invalidReason === 'insufficient_funds') {
            throw new Error(`Insufficient USDC balance. You need at least $${COST_CONFIG.competitorAnalysis} USDC on Base Sepolia.`);
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('USDC')) {
            throw parseError;
          }
        }
        throw new Error(`Payment failed. Please ensure you have sufficient USDC balance ($${COST_CONFIG.competitorAnalysis}) on Base Sepolia.`);
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start analysis');
      }

      const { runId } = await response.json();
      router.push(`/report/${runId}`);
    } catch (error) {
      console.error('[Client] Failed to start analysis:', error);
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('402') || error.message.includes('Payment')) {
          errorMessage = `Payment failed. Please ensure you have sufficient USDC balance ($${COST_CONFIG.competitorAnalysis}) on Base Sepolia.`;
        } else if (error.message.includes('rejected')) {
          errorMessage = 'Payment was rejected by your wallet';
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const isValid = url.trim().length >= 4 && focus.trim().length >= 2;

  return (
    <div className="flex items-center justify-center" style={{ backgroundColor: '#212121', minHeight: '100vh', paddingBottom: '80px' }}>
      <AsciiBackground />
      <main className="w-full">
        <section className="max-w-6xl mx-auto px-8 md:px-6 w-full pt-16 md:pt-0">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 md:mb-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#888888' }} />
              <span className="text-sm font-medium" style={{ color: '#CCCCCC' }}>AI-Powered Competitor Intelligence</span>
            </div>

            <h1 className="text-4xl md:text-7xl font-bold mb-3 md:mb-4 leading-tight px-2" style={{ color: '#FFFFFF' }}>
              Know Your
              <br />
              <span style={{ color: '#888888' }}>Competition</span>
            </h1>

            <p className="text-sm md:text-2xl mb-6 md:mb-3 max-w-2xl mx-auto leading-relaxed px-4 md:px-0" style={{ color: '#CCCCCC' }}>
              Discover and analyse your top competitors with SWOT analysis and strategic recommendations
            </p>
          </div>

          <div className="max-w-2xl mx-auto px-4 md:px-0">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Your website URL (e.g., myapp.com)"
                  disabled={loading}
                  className="w-full px-4 md:px-6 py-4 md:py-5 text-base md:text-lg rounded-xl border-2 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderColor: focused ? '#444444' : (error ? '#EF4444' : '#2A2A2A'),
                    color: '#FFFFFF',
                  }}
                />
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={focus}
                  onChange={(e) => { setFocus(e.target.value); setError(null); }}
                  placeholder="Focus area (e.g., pricing, features, content strategy)"
                  disabled={loading}
                  className="w-full px-4 md:px-6 py-4 md:py-5 text-base md:text-lg rounded-xl border-2 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderColor: '#2A2A2A',
                    color: '#FFFFFF',
                  }}
                />
              </div>

              {error && (
                <p className="text-sm flex items-center gap-2 px-2" style={{ color: '#EF4444' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !isValid}
                className="w-full py-4 md:py-5 px-6 rounded-xl font-semibold text-base md:text-lg transition-all flex items-center justify-center gap-3 group disabled:cursor-not-allowed relative overflow-hidden mt-6 md:mt-8"
                style={{
                  backgroundColor: (loading || !isValid) ? '#CCCCCC' : '#FFFFFF',
                  color: '#000000',
                }}
              >
                {loading ? (
                  <span className="text-base md:text-lg font-semibold" style={{ color: '#000000' }}>
                    Analysing competitors...
                  </span>
                ) : (
                  <>
                    <span>Analyse Competitors</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-center text-xs md:text-sm px-2" style={{ color: '#999999' }}>
                Powered by AI • ${COST_CONFIG.competitorAnalysis} USDC per report
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
