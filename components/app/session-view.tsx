'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useSessionContext, useSessionMessages } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { ChatTranscript } from '@/components/app/chat-transcript';
import { PreConnectMessage } from '@/components/app/preconnect-message';
import { TileLayout } from '@/components/app/tile-layout';
import {
  type ControlBarControls,
} from '@/components/livekit/agent-control-bar/agent-control-bar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';
import { Track } from 'livekit-client';
import { PhoneDisconnectIcon, ChatTextIcon } from '@phosphor-icons/react/dist/ssr';
import { TrackSelector } from '@/components/livekit/agent-control-bar/track-selector';
import { TrackToggle } from '@/components/livekit/agent-control-bar/track-toggle';
import { useInputControls } from '@/components/livekit/agent-control-bar/hooks/use-input-controls';
import { usePublishPermissions } from '@/components/livekit/agent-control-bar/hooks/use-publish-permissions';
import { Button } from '@/components/livekit/button';
import { Toggle } from '@/components/livekit/toggle';
import { ChatInput } from '@/components/livekit/agent-control-bar/chat-input';
import { useChat, useRemoteParticipants } from '@livekit/components-react';

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

const Fade = ({ top = false, bottom = false, className }: FadeProps) => {
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
  const [chatOpen, setChatOpen] = useState(false); // Default to false as requested
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { send } = useChat();
  const participants = useRemoteParticipants();
  const publishPermissions = usePublishPermissions();

  const {
    micTrackRef,
    cameraToggle,
    microphoneToggle,
    screenShareToggle,
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMicrophoneDeviceSelectError,
    handleCameraDeviceSelectError,
  } = useInputControls({
    saveUserChoices: true,
    onDeviceError: (error) => console.error('Device error:', error)
  });

  const handleSendMessage = async (message: string) => {
    await send(message);
  };

  const isAgentAvailable = participants.some((p) => p.isAgent);

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: appConfig.supportsChatInput,
    camera: appConfig.supportsVideoInput,
    screenShare: appConfig.supportsVideoInput,
  };

  useEffect(() => {
    // Auto-scroll on new messages
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section
      className="bg-background relative z-10 h-screen w-full flex flex-col overflow-hidden"
      {...props}
    >
      {/* Floating Visualizer - Top Right Corner */}
      <div className="fixed top-4 right-4 z-30">
        <TileLayout chatOpen={chatOpen} />
      </div>

      {/* Main Chat Container - Centered and Full Height */}
      <div className="flex-1 flex flex-col items-stretch w-full h-full pt-6 pb-3 px-4 overflow-hidden">
        <div
          className={cn(
            'glass relative z-40 flex-1 flex flex-col transition-all duration-500 ease-in-out w-full max-w-4xl mx-auto rounded-2xl border border-border/30 overflow-hidden shadow-2xl',
          )}
        >
          {/* Header with Integrated Controls */}
          <div className="border-b border-border/50 px-4 py-2 flex items-center justify-between bg-background/30 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              {/* Microphone */}
              <TrackSelector
                kind="audioinput"
                aria-label="Toggle microphone"
                source={Track.Source.Microphone}
                pressed={microphoneToggle.enabled}
                disabled={microphoneToggle.pending}
                audioTrackRef={micTrackRef}
                onPressedChange={microphoneToggle.toggle}
                onMediaDeviceError={handleMicrophoneDeviceSelectError}
                onActiveDeviceChange={handleAudioDeviceChange}
                minimal
                className="origin-left"
              />

              {/* Camera */}
              {controls.camera && (
                <TrackSelector
                  kind="videoinput"
                  aria-label="Toggle camera"
                  source={Track.Source.Camera}
                  pressed={cameraToggle.enabled}
                  pending={cameraToggle.pending}
                  disabled={cameraToggle.pending}
                  onPressedChange={cameraToggle.toggle}
                  onMediaDeviceError={handleCameraDeviceSelectError}
                  onActiveDeviceChange={handleVideoDeviceChange}
                  minimal
                  className="origin-left"
                />
              )}

              {/* Screen Share */}
              {controls.screenShare && (
                <TrackToggle
                  size="icon"
                  variant="secondary"
                  aria-label="Toggle screen share"
                  source={Track.Source.ScreenShare}
                  pressed={screenShareToggle.enabled}
                  disabled={screenShareToggle.pending}
                  onPressedChange={screenShareToggle.toggle}
                  className="size-8"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Chat Toggle */}
              {controls.chat && (
                <Toggle
                  size="icon"
                  variant="secondary"
                  aria-label="Toggle transcript"
                  pressed={chatOpen}
                  onPressedChange={setChatOpen}
                  className="size-8"
                >
                  <ChatTextIcon weight="bold" />
                </Toggle>
              )}

              {/* End Call Button */}
              <Button
                variant="destructive"
                onClick={session.end}
                disabled={!session.isConnected}
                className="h-9 px-4 text-[10px] font-mono tracking-tighter"
              >
                <PhoneDisconnectIcon weight="bold" className="size-3" />
                <span>END CALL</span>
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 min-h-0 relative flex flex-col">
            <Fade top className="absolute inset-x-0 top-0 z-10 h-8 shrink-0" />
            <ScrollArea ref={scrollAreaRef} className="flex-1 h-full px-4 pt-4 pb-8 md:px-6 scrollbar-hide">
              <ChatTranscript
                messages={messages}
                className="space-y-4 pb-4"
              />
            </ScrollArea>
            <Fade bottom className="absolute inset-x-0 bottom-0 z-10 h-8 shrink-0" />
          </div>

          {/* Integrated Status and Chat Input */}
          <div className="px-4 pb-2 bg-background/20 backdrop-blur-md flex flex-col gap-2">
            {appConfig.isPreConnectBufferEnabled && (
              <PreConnectMessage messages={messages} className="!pb-0 pt-2" />
            )}
            {chatOpen && (
              <ChatInput
                chatOpen={chatOpen}
                isAgentAvailable={isAgentAvailable}
                onSend={handleSendMessage}
              />
            )}
          </div>
        </div>

        {/* Disclaimer - Now outside the glass container */}
        <div className="text-[9px] text-center text-foreground/20 font-mono tracking-tight pt-2.5 leading-none uppercase max-w-4xl mx-auto w-full">
          AI can make mistakes. Always double-check results. Trading involves significant risk.
        </div>
      </div>
    </section>
  );
};
