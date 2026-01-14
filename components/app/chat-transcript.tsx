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



// Helper to normalize symbols for robust matching (e.g. "BTC/USDT" -> "btcusdt")
function normalizeSymbol(symbol: string): string {
  return symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
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
      try {
        const str = new TextDecoder().decode(payload);
        const data = JSON.parse(str);

        if (topic === 'analysis_status' && data.status === 'started') {
          // Attempt to associate this with the most recent remote message
          // This ensures the card appears in the correct place in the transcript flow
          let id = Date.now().toString();
          const lastRemoteMsg = [...messages].reverse().find(m => !m.from?.isLocal);
          if (lastRemoteMsg) {
            id = lastRemoteMsg.timestamp.toString();
          }

          setAnalyses(prev => ({
            ...prev,
            [id]: {
              info: {
                symbol: data.symbol || 'CRYPTO/USDT',
                timeframe: data.timeframe || '1H'
              },
              isActive: true,
              isPending: false,
              triggerTimestamp: Date.now(),
              data: undefined
            }
          }));
          setActiveAnalysisId(id);
          console.log('Received analysis_started signal, associated with ID:', id);
        }

        if (topic === 'analysis_data' && data.data) {
          setAnalyses(prev => {
            let targetId = activeAnalysisId;

            if (data.symbol) {
              const normalizedTarget = normalizeSymbol(data.symbol);
              const matchingId = Object.keys(prev).reverse().find(id =>
                normalizeSymbol(prev[id].info.symbol) === normalizedTarget && prev[id].isActive
              );

              if (matchingId) targetId = matchingId;
            }

            if (!targetId || !prev[targetId]) {
              // Final fallback: just use the absolute most recent analysis if we're lost
              const ids = Object.keys(prev);
              if (ids.length > 0) targetId = ids[ids.length - 1];
            }

            if (!targetId || !prev[targetId]) {
              console.warn('Received data but no target analysis', data.symbol);
              return prev;
            }

            return {
              ...prev,
              [targetId]: {
                ...prev[targetId],
                data: data.data,
                info: data.symbol ? { symbol: data.symbol, timeframe: data.timeframe || '1H' } : prev[targetId].info
              }
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse room data', e);
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room, activeAnalysisId, messages]);

  // Handle message processing for inactivation only
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.id && processedMessageIds.current.has(lastMsg.id)) return;
    if (processedTimestamps.current.has(lastMsg.timestamp)) return;

    if (lastMsg.id) processedMessageIds.current.add(lastMsg.id);
    processedTimestamps.current.add(lastMsg.timestamp);

    // Check for completion text to mark items as inactive
    if (!lastMsg.from?.isLocal && lastMsg.message &&
      (lastMsg.message.includes("Analysis complete") ||
        lastMsg.message.includes("detailed results") ||
        lastMsg.message.includes("FINAL VERDICT"))) {
      if (activeAnalysisId) {
        setAnalyses(prev => {
          if (!activeAnalysisId || !prev[activeAnalysisId]) return prev;
          return {
            ...prev,
            [activeAnalysisId]: { ...prev[activeAnalysisId], isActive: false }
          };
        });
        setActiveAnalysisId(null);
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

          {/* Fallback for "unassociated" analyses at the bottom */}
          {Object.entries(analyses)
            .filter(([id]) => !messages.some(m => m.timestamp.toString() === id))
            .map(([id, analysis]) => (
              <motion.div
                key={id}
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
            ))}

        </MotionContainer>
      )}
    </AnimatePresence>
  );
}

