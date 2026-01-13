import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ChatEntryProps extends React.HTMLAttributes<HTMLLIElement> {
  /** The locale to use for the timestamp. */
  locale: string;
  /** The timestamp of the message. */
  timestamp: number;
  /** The message to display. */
  message: string;
  /** The origin of the message. */
  messageOrigin: 'local' | 'remote';
  /** The sender's name. */
  name?: string;
  /** Whether the message has been edited. */
  hasBeenEdited?: boolean;
}

// Check if message contains analysis data
function isAnalysisMessage(message: string): boolean {
  return message.includes('Analysis complete for') &&
    message.includes('FINAL VERDICT:');
}

// Parse and render analysis data as structured UI
function AnalysisCard({ message }: { message: string }) {
  // Extract data from the message
  const symbolMatch = message.match(/Analysis complete for ([A-Z]+\/[A-Z]+) on ([A-Z0-9]+) timeframe/i);
  const priceMatch = message.match(/Current Price: \$([0-9.]+)/);
  const changeMatch = message.match(/24h Change: ([+-]?[0-9.]+)%/);
  const rsiMatch = message.match(/RSI: ([0-9.]+) \(([A-Z]+)\)/);
  const macdMatch = message.match(/MACD: ([A-Z]+)/);
  const adxMatch = message.match(/ADX: ([0-9.]+)/);
  const upSignalsMatch = message.match(/UP signals: (\d+)/);
  const downSignalsMatch = message.match(/DOWN signals: (\d+)/);
  const verdictMatch = message.match(/FINAL VERDICT: ([A-Z]+)/);
  const confidenceMatch = message.match(/Confidence: (\d+)%/);
  const qualityMatch = message.match(/Quality Score: (\d+)%/);
  const entryMatch = message.match(/Entry: ([^\n]+)/);
  const targetMatch = message.match(/Target: ([^\n]+)/);
  const stopMatch = message.match(/Stop Loss: ([^\n]+)/);
  const rrMatch = message.match(/Risk\/Reward: ([0-9.]+):1/);

  const symbol = symbolMatch?.[1] || 'Unknown';
  const timeframe = symbolMatch?.[2] || '';
  const price = priceMatch?.[1] || '0';
  const change = parseFloat(changeMatch?.[1] || '0');
  const verdict = verdictMatch?.[1] || 'NEUTRAL';
  const confidence = confidenceMatch?.[1] || '0';

  const verdictColor = verdict === 'UP' ? 'text-green-400 border-green-500/30' :
    verdict === 'DOWN' ? 'text-red-400 border-red-500/30' :
      'text-yellow-400 border-yellow-500/30';

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Header */}
      <div className="glass rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-lg font-bold text-primary font-mono">{symbol}</span>
            <span className="text-xs text-muted-foreground ml-2 font-mono">{timeframe}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground font-mono">${price}</div>
            <div className={cn('text-xs font-mono', change >= 0 ? 'text-green-400' : 'text-red-400')}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="glass rounded-xl p-4 border border-border/30">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
          Technical Indicators
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-background/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground font-mono">RSI</div>
            <div className={cn('text-sm font-bold font-mono',
              rsiMatch?.[2] === 'UP' ? 'text-green-400' :
                rsiMatch?.[2] === 'DOWN' ? 'text-red-400' : 'text-yellow-400'
            )}>
              {rsiMatch?.[1] || '-'}
            </div>
          </div>
          <div className="bg-background/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground font-mono">MACD</div>
            <div className={cn('text-sm font-bold font-mono',
              macdMatch?.[1] === 'UP' ? 'text-green-400' :
                macdMatch?.[1] === 'DOWN' ? 'text-red-400' : 'text-yellow-400'
            )}>
              {macdMatch?.[1] || '-'}
            </div>
          </div>
          <div className="bg-background/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground font-mono">ADX</div>
            <div className="text-sm font-bold font-mono text-foreground">
              {adxMatch?.[1] || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Signals */}
      <div className="glass rounded-xl p-4 border border-border/30">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
          Signal Summary
        </div>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 font-mono">{upSignalsMatch?.[1] || '0'}</div>
            <div className="text-[10px] text-muted-foreground font-mono">UP</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 font-mono">{downSignalsMatch?.[1] || '0'}</div>
            <div className="text-[10px] text-muted-foreground font-mono">DOWN</div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className={cn('glass rounded-xl p-4 border text-center', verdictColor)}>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
          Final Verdict
        </div>
        <div className={cn('text-3xl font-bold font-mono', verdictColor.split(' ')[0])}>
          {verdict}
        </div>
        <div className="text-sm text-foreground/70 font-mono mt-1">
          {confidence}% Confidence • {qualityMatch?.[1] || '0'}% Quality
        </div>
      </div>

      {/* Trade Targets */}
      {verdict !== 'NEUTRAL' && (
        <div className="glass rounded-xl p-4 border border-border/30">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
            Trade Targets
          </div>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-green-400">Entry:</span>
              <span className="text-foreground">{entryMatch?.[1]?.trim() || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary">Target:</span>
              <span className="text-foreground">{targetMatch?.[1]?.trim() || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">Stop Loss:</span>
              <span className="text-foreground">{stopMatch?.[1]?.trim() || 'N/A'}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/30">
              <span className="text-muted-foreground">Risk/Reward:</span>
              <span className="text-primary font-bold">{rrMatch?.[1] || '0'}:1</span>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-[10px] text-center text-muted-foreground/50 font-mono">
        ⚠️ AI analysis only. Not financial advice.
      </div>
    </div>
  );
}

export const ChatEntry = ({
  name,
  locale,
  timestamp,
  message,
  messageOrigin,
  hasBeenEdited = false,
  className,
  ...props
}: ChatEntryProps) => {
  const time = new Date(timestamp).toLocaleTimeString(locale, { timeStyle: 'short' });
  const title = new Date(timestamp).toLocaleTimeString(locale, { timeStyle: 'full' });
  const isLocal = messageOrigin === 'local';
  const isAnalysis = !isLocal && isAnalysisMessage(message);

  // Render analysis card for analysis messages
  if (isAnalysis) {
    return (
      <li
        title={title}
        data-lk-message-origin={messageOrigin}
        className={cn('flex flex-col gap-1.5 items-start', className)}
        {...props}
      >
        <div className="flex items-center gap-2 opacity-40">
          <span className="font-mono text-[10px] uppercase tracking-widest">
            ANALYSIS_RESULT
          </span>
          <span className="font-mono text-[10px]">{time}</span>
        </div>
        <AnalysisCard message={message} />
      </li>
    );
  }

  return (
    <li
      title={title}
      data-lk-message-origin={messageOrigin}
      className={cn(
        'flex flex-col gap-1.5 transition-all duration-300',
        isLocal ? 'items-end text-right' : 'items-start text-left',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 opacity-40">
        <span className="font-mono text-[10px] uppercase tracking-widest">
          {isLocal ? 'USER_INPUT' : 'AGENT_RESPONSE'}
        </span>
        <span className="font-mono text-[10px]">{time}</span>
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-3 font-mono text-sm leading-relaxed shadow-sm transition-all',
          isLocal
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-foreground/5 text-foreground border border-border/30'
        )}
      >
        {message}
      </div>
    </li>
  );
};
