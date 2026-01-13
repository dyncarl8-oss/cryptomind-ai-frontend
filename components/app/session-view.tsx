'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { ChatTranscript } from '@/components/app/chat-transcript';
import { PreConnectMessage } from '@/components/app/preconnect-message';
import { TileLayout } from '@/components/app/tile-layout';
import {
  AgentControlBar,
  type ControlBarControls,
} from '@/components/livekit/agent-control-bar/agent-control-bar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';

const MotionBottom = motion.create('div');

const BOTTOM_VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut',
  },
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

interface SessionViewProps {
  appConfig: AppConfig;
}

export const SessionView = ({
  appConfig,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: appConfig.supportsChatInput,
    camera: appConfig.supportsVideoInput,
    screenShare: appConfig.supportsVideoInput,
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section
      className="bg-background relative z-10 flex h-full w-full flex-col overflow-hidden items-center pt-8 md:pt-12"
      {...props}
    >
      {/* Top: Visualizer */}
      <div className="w-full max-w-4xl z-20">
        <TileLayout chatOpen={chatOpen} />
      </div>

      {/* Middle: Centered Chat Box */}
      <div
        className={cn(
          'glass relative z-40 flex flex-col transition-all duration-500 ease-in-out w-full max-w-2xl flex-1 min-h-0 mb-[140px] rounded-2xl border border-border/30 overflow-hidden shadow-2xl',
          !chatOpen && 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between bg-background/20 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-primary font-bold">
              Terminal Output
            </span>
            <div className="flex gap-1.5">
              <div className="size-2 rounded-full bg-red-500/30" />
              <div className="size-2 rounded-full bg-yellow-500/30" />
              <div className="size-2 rounded-full bg-green-500/30" />
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <Fade top className="absolute inset-x-0 top-0 z-10 h-12" />
            <ScrollArea ref={scrollAreaRef} className="h-full px-4 pt-4 pb-12 md:px-8 scrollbar-hide">
              <ChatTranscript
                hidden={!chatOpen}
                messages={messages}
                className="space-y-6"
              />
            </ScrollArea>
            <Fade bottom className="absolute inset-x-0 bottom-0 z-10 h-12" />
          </div>
        </div>
      </div>

      {/* Bottom: Centered Controls */}
      <MotionBottom
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-8 md:pb-12 px-4"
      >
        <div className="w-full max-w-2xl">
          {appConfig.isPreConnectBufferEnabled && (
            <PreConnectMessage messages={messages} className="pb-4" />
          )}
          <AgentControlBar
            controls={controls}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onChatOpenChange={setChatOpen}
            className="shadow-2xl border border-border/50 bg-background/80 backdrop-blur-md"
          />
        </div>
      </MotionBottom>
    </section>
  );
};
