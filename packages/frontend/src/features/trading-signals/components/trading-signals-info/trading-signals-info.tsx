'use client';

/**
 * Trading Signals Information Component
 * 
 * Displays an informational card explaining how trading signals work,
 * how to connect signals to the platform, and platform flexibility.
 * Includes a "Create Test Signal" form to trigger a manual test signal.
 * Collapsible component that is hidden by default.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { tradingSignalsService } from '@/infrastructure/api/services/trading-signals.service';
import Link from 'next/link';
import { Info, Zap, Link2, Network, Code, ChevronDown, ExternalLink, Send } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const TEST_SIGNAL = {
  signalType: 'Manual Trigger',
  activationReason: 'Manually triggered trading signal from within the trading engine.',
  signalStrength: 1 as const,
  source: 'Trading engine',
};

export function TradingSignalsInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [mintAddress, setMintAddress] = useState('');
  const [symbol, setSymbol] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreateTestSignal = async () => {
    const trimmedMint = mintAddress.trim();
    if (!trimmedMint) {
      toast({
        title: 'Mint address required',
        description: 'Please enter a token (mint) address.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await tradingSignalsService.createTradingSignal({
        tokenAddress: trimmedMint,
        symbol: symbol.trim() || undefined,
        signalType: TEST_SIGNAL.signalType,
        activationReason: TEST_SIGNAL.activationReason,
        signalStrength: TEST_SIGNAL.signalStrength,
        source: TEST_SIGNAL.source,
      });
      toast({
        title: 'Test signal sent',
        description: 'The signal was created and will be processed like a normal signal.',
      });
      setMintAddress('');
      setSymbol('');
      queryClient.invalidateQueries({ queryKey: ['trading-signals'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create test signal.';
      toast({
        title: 'Could not create test signal',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get API base URL from environment
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const apiEndpoint = `${apiBaseUrl}/api/v1/trading-signals`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="bg-muted/50 border-[#262626]">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#16B364]" />
                <h3 className="text-sm font-semibold">
                  Trading Signals Information
                </h3>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "transform rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Section 1: What Are Trading Signals */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Info className="h-5 w-5 text-[#16B364]" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-semibold leading-none">
                  What Are Trading Signals?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automated alerts that indicate potential trading opportunities with token information, strategies, and signal strength (1-5).
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Trigger trading actions when connected to agents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Include metadata like source, timestamp, and activation reason</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Real-time processing for immediate execution</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: How to Connect Signals */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Link2 className="h-5 w-5 text-[#16B364]" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-semibold leading-none">
                  Connect Your Signals
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect external signal sources through API integration, webhooks, or custom data sources.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>API integration for programmatic access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Webhook endpoints for real-time delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Custom data sources via integrations page</span>
                  </li>
                </ul>
                <Link
                  href="https://docs.nexgent.ai/signal-engine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#16B364] hover:underline mt-2"
                >
                  Connect to Nexgent AI trading signals
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Section 3: Platform Flexibility */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Network className="h-5 w-5 text-[#16B364]" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-semibold leading-none">
                  Platform Flexibility
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Nexgent open-source trading platform supports signals from <strong className="text-foreground">any platform or data source</strong>. No vendor lock-in.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Connect multiple signal sources simultaneously</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Custom signal formats supported via API</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16B364] mt-1">•</span>
                    <span>Works with any trading signal provider</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-6 pt-6 border-t border-[#262626]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Zap className="h-5 w-5 text-[#16B364]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">How it works:</strong> When a signal is received, 
                the Nexgent open-source trading platform processes it and makes it available to your trading agents. 
                Agents can be configured to automatically act on signals based on your trading strategy and risk preferences.
              </p>
            </div>
          </div>
        </div>

        {/* API Endpoint Section */}
        <div className="mt-6 pt-6 border-t border-[#262626]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Code className="h-5 w-5 text-[#16B364]" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-semibold leading-none mb-2">
                  API Endpoint
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Send trading signals to the platform via a simple HTTP POST request. Include the <strong className="text-foreground">X-Api-Key</strong> header with your API key for authentication.
                </p>
              </div>
              <div className="bg-background/50 border border-[#262626] rounded-lg p-4 font-mono text-xs">
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground">POST</span>{' '}
                    <span className="text-[#16B364] break-all">{apiEndpoint}</span>
                  </div>
                  <div className="pt-2 border-t border-[#262626]">
                    <div className="text-muted-foreground mb-1">Required Header:</div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{`X-Api-Key: your-api-key`}</pre>
                  </div>
                  <div className="pt-2 border-t border-[#262626]">
                    <div className="text-muted-foreground mb-1">Request Body:</div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{`{
  "tokenAddress": "string (required)",
  "symbol": "string (optional)",
  "signalType": "string (required)",
  "activationReason": "string (optional)",
  "signalStrength": 1-5 (required),
  "source": "string (optional)"
}`}</pre>
                  </div>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5 mt-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#16B364] mt-1">•</span>
                  <span><strong className="text-foreground">X-Api-Key</strong> header is required</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#16B364] mt-1">•</span>
                  <span>Content-Type: application/json</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#16B364] mt-1">•</span>
                  <span>Returns 201 Created with signal details</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Create Test Signal Section */}
        <div className="mt-6 pt-6 border-t border-[#262626]">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-[#16B364] flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold leading-none mb-1">
                    Create Test Signal
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Send a manual test signal with a Mint address and optional Symbol. Strategy: <strong className="text-foreground">Manual Trigger</strong>, strength <strong className="text-foreground">1</strong>, source <strong className="text-foreground">Trading engine</strong>. It will be processed like any other signal.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-signal-mint">Mint address</Label>
                    <Input
                      id="test-signal-mint"
                      placeholder="e.g. So11111111111111111111111111111111111111112"
                      value={mintAddress}
                      onChange={(e) => setMintAddress(e.target.value)}
                      className="font-mono text-xs"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test-signal-symbol">Symbol (optional)</Label>
                    <Input
                      id="test-signal-symbol"
                      placeholder="e.g. SOL"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateTestSignal}
                  disabled={isSubmitting || !mintAddress.trim()}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Create Test Signal
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

