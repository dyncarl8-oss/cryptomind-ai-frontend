'use client';

import { cn } from '@/lib/utils';

import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import { type ReceivedMessage } from '@livekit/components-react';
import { ChatEntry } from '@/components/livekit/chat-entry';
import { AnalysisProgress, type StepData } from '@/components/app/analysis-progress';
import { useState, useEffect, useRef } from 'react';

const MotionContainer = motion.create('div');
const MotionChatEntry = motion.create(ChatEntry);

const CONTAINER_MOTION_PROPS = {
  variants: {
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeOut',
        duration: 0.3,
        staggerChildren: 0.1,
        staggerDirection: -1,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        ease: 'easeOut',
        duration: 0.3,
        stagerDelay: 0.2,
        staggerChildren: 0.1,
        staggerDirection: 1,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const MESSAGE_MOTION_PROPS = {
  variants: {
    hidden: {
      opacity: 0,
      translateY: 10,
    },
    visible: {
      opacity: 1,
      translateY: 0,
    },
  },
};

interface ChatTranscriptProps {
  hidden?: boolean;
  messages?: ReceivedMessage[];
}

// Check if AI announced it's starting analysis
function detectAnalysisStart(messages: ReceivedMessage[]): { symbol: string; timeframe: string } | null {
  // Look at recent AI messages for analysis start announcement
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 5); i--) {
    const msg = messages[i];
    if (!msg.from?.isLocal && msg.message) {
      const text = msg.message.toLowerCase();

      // Detect AI announcing analysis
      const isStartingAnalysis =
        text.includes('starting analysis') ||
        text.includes('analyze') && text.includes('now') ||
        text.includes('running') && text.includes('analysis') ||
        text.includes('please hold') ||
        text.includes('processing') ||
        text.includes('gathering data') ||
        text.includes('let me analyze') ||
        text.includes("i'll analyze");

      if (isStartingAnalysis) {
        // Try to extract symbol from the message
        const symbolMatch = msg.message.match(/([A-Z]{2,10})\s*[\/\-]?\s*(USDT?|USD|BTC|ETH)/i);
        const timeframeMatch = msg.message.match(/(\d+[MHDWhmdw]|[HMDWhmdw]\d+|hour|minute|day|week)/i);

        const symbol = symbolMatch
          ? `${symbolMatch[1].toUpperCase()}/${symbolMatch[2].toUpperCase()}`
          : 'CRYPTO/USDT';

        let timeframe = '1H';
        if (timeframeMatch) {
          const tf = timeframeMatch[1].toLowerCase();
          if (tf.includes('hour') || tf === 'h') timeframe = '1H';
          else if (tf === '4h' || tf === 'h4' || tf.includes('4')) timeframe = '4H';
          else if (tf === '1d' || tf === 'd1' || tf.includes('day')) timeframe = '1D';
          else timeframe = timeframeMatch[1].toUpperCase();
        }

        return { symbol, timeframe };
      }
    }
  }
  return null;
}

// Check if analysis result has been received
function hasAnalysisResult(messages: ReceivedMessage[]): boolean {
  for (let i = messages.length - 1; i >= Math.max(0, messages.length - 3); i--) {
    const msg = messages[i];
    if (!msg.from?.isLocal && msg.message) {
      if (msg.message.includes('Analysis complete') ||
        msg.message.includes('FINAL VERDICT') ||
        msg.message.includes('My verdict is')) {
        return true;
      }
    }
  }
  return false;
}

// Parse final analysis result into structured StepData
function parseAnalysisResult(text: string): StepData | null {
  try {
    const priceMatch = text.match(/Current Price: \$([0-9.]+)/);
    const changeMatch = text.match(/24h Change: ([+-]?[0-9.]+)%/);
    const rsiMatch = text.match(/RSI: ([0-9.]+) \(([A-Z]+)\)/);
    const macdMatch = text.match(/MACD: ([A-Z]+)/);
    const adxMatch = text.match(/ADX: ([0-9.]+)/);
    const upSignalsMatch = text.match(/UP signals: (\d+) \(score: ([0-9.]+)\)/);
    const downSignalsMatch = text.match(/DOWN signals: (\d+) \(score: ([0-9.]+)\)/);
    const verdictMatch = text.match(/FINAL VERDICT: ([A-Z]+)/);
    const confidenceMatch = text.match(/Confidence: (\d+)%/);
    const entryMatch = text.match(/Entry: ([^\n]+)/);
    const targetMatch = text.match(/Target: ([^\n]+)/);
    const stopMatch = text.match(/Stop Loss: ([^\n]+)/);

    if (!priceMatch) return null;

    return {
      price: `$${priceMatch[1]}`,
      change: `${changeMatch?.[1]}%`,
      candles: 300, // Fixed for now as it's not always in text
      rsi: {
        value: parseFloat(rsiMatch?.[1] || '50'),
        signal: rsiMatch?.[2] || 'NEUTRAL'
      },
      macd: { signal: macdMatch?.[1] || 'NEUTRAL' },
      adx: { value: parseFloat(adxMatch?.[1] || '25') },
      upSignals: parseInt(upSignalsMatch?.[1] || '0'),
      downSignals: parseInt(downSignalsMatch?.[1] || '0'),
      upScore: parseFloat(upSignalsMatch?.[2] || '0'),
      downScore: parseFloat(downSignalsMatch?.[2] || '0'),
      verdict: verdictMatch?.[1],
      confidence: parseInt(confidenceMatch?.[1] || '0'),
      entry: entryMatch?.[1],
      target: targetMatch?.[1],
      stop: stopMatch?.[1]
    };
  } catch (e) {
    return null;
  }
}

// Helper to normalize symbols for robust matching (e.g. "BTC/USDT" -> "btcusdt")
function normalizeSymbol(symbol: string): string {
  return symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Check if a specific message is an analysis start announcement
function getMessageAnalysisInfo(msg: ReceivedMessage): { symbol: string; timeframe: string } | null {
  if (!msg.from?.isLocal && msg.message) {
    const text = msg.message.toLowerCase();

    // Detect AI announcing START of analysis
    // STRICTER DETECTION: Only match specific "starting" or "checking" phrases to avoid false positives
    const isStartingAnalysis =
      (text.includes('starting') && text.includes('analysis')) ||
      (text.includes('checking') && (text.includes('btc') || text.includes('eth') || text.includes('sol') || text.includes('usdt') || text.includes('...'))) ||
      (text.includes('analyze') && (text.includes('now') || text.includes('process') || text.includes('timeframe'))) ||
      (text.includes('analyzing') && text.includes('now'));

    if (isStartingAnalysis) {
      // Try to extract symbol from the message
      const symbolMatch = msg.message.match(/([A-Z]{2,10})\s*[\/\-]?\s*(USDT?|USD|BTC|ETH)/i);
      const timeframeMatch = msg.message.match(/(\d+[MHDWhmdw]|[HMDWhmdw]\d+|hour|minute|day|week)/i);

      const symbol = symbolMatch
        ? `${symbolMatch[1].toUpperCase()}/${symbolMatch[2].toUpperCase()}`
        : 'CRYPTO/USDT';

      let timeframe = '1H';
      if (timeframeMatch) {
        const tf = timeframeMatch[1].toLowerCase();
        if (tf.includes('hour') || tf === 'h') timeframe = '1H';
        else if (tf === '4h' || tf === 'h4' || tf.includes('4')) timeframe = '4H';
        else if (tf === '1d' || tf === 'd1' || tf.includes('day')) timeframe = '1D';
        else timeframe = timeframeMatch[1].toUpperCase();
      }

      return { symbol, timeframe };
    }
  }
  return null;
}

import { RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

export function ChatTranscript({
  hidden = false,
  messages = [],
  ...props
}: ChatTranscriptProps & Omit<HTMLMotionProps<'div'>, 'ref'>) {
  interface AnalysisState {
    info: { symbol: string; timeframe: string };
    data?: StepData;
    isActive: boolean;
    isPending: boolean; // For display delay
    triggerTimestamp: number | null;
  }

  const [analyses, setAnalyses] = useState<Record<string, AnalysisState>>({});
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  const prevMessagesLength = useRef(messages.length);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const processedTimestamps = useRef<Set<number>>(new Set()); // New ref for stability
  const room = useRoomContext();

  // Listen for analysis data packets
  useEffect(() => {
    const onDataReceived = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
      if (topic === 'analysis_data') {
        try {
          const str = new TextDecoder().decode(payload);
          const data = JSON.parse(str);

          if (data.data) {
            setAnalyses(prev => {
              // Try to find the best match:
              // 1. If symbol provided, find an analysis (active or recently active) for that symbol using normalized matching
              // 2. Otherwise fall back to activeAnalysisId
              let targetId = activeAnalysisId;

              if (data.symbol) {
                const normalizedTarget = normalizeSymbol(data.symbol);
                // Search backwards for the most recent match
                const matchingId = Object.keys(prev).reverse().find(id =>
                  normalizeSymbol(prev[id].info.symbol) === normalizedTarget
                );

                if (matchingId) {
                  targetId = matchingId;
                } else if (activeAnalysisId && (prev[activeAnalysisId].info.symbol.includes('/') || prev[activeAnalysisId].info.symbol === 'CRYPTO')) {
                  // Fallback: If we have an active analysis even with a slash (like CRYPTO/USDT)
                  // and the incoming data has a real symbol, assume this is the one.
                  targetId = activeAnalysisId;
                }
              }

              if (!targetId || !prev[targetId]) {
                console.warn('Received analysis data but could not find a target analysis', data.symbol);
                return prev;
              }

              return {
                ...prev,
                [targetId]: {
                  ...prev[targetId],
                  data: data.data,
                  // Ensure it's not pending if we got real data
                  isPending: false,
                  info: data.symbol ? { symbol: data.symbol, timeframe: data.timeframe || '1H' } : prev[targetId].info
                }
              };
            });
          }
        } catch (e) {
          console.error('Failed to parse analysis data', e);
        }
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  useEffect(() => {
    if (messages.length === 0) return;

    // Check recent messages for trigger (scan last 3 to trigger reliably during streaming)
    for (let i = messages.length - 1; i >= Math.max(0, messages.length - 3); i--) {
      const msg = messages[i];

      // Skip if we already processed this message (check BOTH ID and Timestamp for stability during streaming)
      if (msg.id && processedMessageIds.current.has(msg.id)) continue;
      if (processedTimestamps.current.has(msg.timestamp)) continue;

      const info = getMessageAnalysisInfo(msg);
      if (info) {
        const id = msg.timestamp.toString(); // Use timestamp as stable key
        setAnalyses(prev => ({
          ...prev,
          [id]: {
            info,
            isActive: true,
            isPending: true, // Start as pending for delay
            triggerTimestamp: msg.timestamp,
            data: undefined
          }
        }));
        setActiveAnalysisId(id);

        if (msg.id) processedMessageIds.current.add(msg.id);
        processedTimestamps.current.add(msg.timestamp);

        // Clear pending state after delay
        setTimeout(() => {
          setAnalyses(prev => {
            if (!prev[id]) return prev;
            return {
              ...prev,
              [id]: { ...prev[id], isPending: false }
            };
          });
        }, 4000);

        break; // Found trigger
      }

      // Check for completion text to mark items as inactive
      if (!msg.from?.isLocal && msg.message && (msg.message.includes("Analysis complete") || msg.message.includes("detailed results") || msg.message.includes("FINAL VERDICT"))) {
        if (activeAnalysisId) {
          setAnalyses(prev => {
            if (!activeAnalysisId || !prev[activeAnalysisId]) return prev;
            return {
              ...prev,
              [activeAnalysisId]: { ...prev[activeAnalysisId], isActive: false }
            };
          });
          // We clear activeAnalysisId, but the entry in 'analyses' remains so it continues to render
          setActiveAnalysisId(null);
        }
      }
    }
  }, [messages, activeAnalysisId]);

  // Watchdog reset for active analysis
  useEffect(() => {
    if (activeAnalysisId && analyses[activeAnalysisId]?.isActive) {
      const timeout = setTimeout(() => {
        setAnalyses(prev => {
          if (!activeAnalysisId || !prev[activeAnalysisId]) return prev;
          return {
            ...prev,
            [activeAnalysisId]: { ...prev[activeAnalysisId], isActive: false }
          };
        });
        setActiveAnalysisId(null);
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [activeAnalysisId, analyses]);

  return (
    <AnimatePresence>
      {!hidden && (
        <MotionContainer
          {...CONTAINER_MOTION_PROPS}
          className={cn('flex flex-col gap-2', props.className)}
        >
          {messages.map((message) => {
            const msgId = message.timestamp.toString();
            const analysis = analyses[msgId];

            return (
              <div key={msgId} className="flex flex-col gap-2">
                <MotionChatEntry
                  {...MESSAGE_MOTION_PROPS}
                  locale={navigator.language}
                  name={message.from?.name}
                  message={message.message || ''}
                  timestamp={message.timestamp}
                  messageOrigin={message.from?.isLocal ? 'local' : 'remote'}
                />
                {analysis && !analysis.isPending && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full"
                  >
                    <AnalysisProgress
                      symbol={analysis.info.symbol}
                      timeframe={analysis.info.timeframe}
                      isActive={analysis.isActive}
                      finalData={analysis.data}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}

        </MotionContainer>
      )}
    </AnimatePresence>
  );
}
