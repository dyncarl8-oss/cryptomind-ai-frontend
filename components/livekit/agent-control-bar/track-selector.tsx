'use client';

import {
  BarVisualizer,
  type TrackReferenceOrPlaceholder,
  useTrackToggle,
} from '@livekit/components-react';
import { TrackDeviceSelect } from '@/components/livekit/agent-control-bar/track-device-select';
import { TrackToggle } from '@/components/livekit/agent-control-bar/track-toggle';
import { cn } from '@/lib/utils';

interface TrackSelectorProps {
  kind: MediaDeviceKind;
  source: Parameters<typeof useTrackToggle>[0]['source'];
  pressed?: boolean;
  pending?: boolean;
  disabled?: boolean;
  className?: string;
  audioTrackRef?: TrackReferenceOrPlaceholder;
  minimal?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  onMediaDeviceError?: (error: Error) => void;
  onActiveDeviceChange?: (deviceId: string) => void;
}

export function TrackSelector({
  kind,
  source,
  pressed,
  pending,
  disabled,
  className,
  audioTrackRef,
  onPressedChange,
  onMediaDeviceError,
  onActiveDeviceChange,
  minimal = false,
}: TrackSelectorProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      <TrackToggle
        size="icon"
        variant="primary"
        source={source}
        pressed={pressed}
        pending={pending}
        disabled={disabled}
        onPressedChange={onPressedChange}
        className={cn(
          'peer/track group/track transition-all duration-300',
          minimal ? 'h-9 w-14 rounded-full px-0' : 'min-w-9 has-[.audiovisualizer]:w-auto has-[.audiovisualizer]:px-3 has-[~_button]:rounded-r-none has-[~_button]:pr-2 has-[~_button]:pl-3'
        )}
      >
        {audioTrackRef && (
          <div className={cn(
            "flex items-center justify-center transition-all duration-300 mx-auto",
            minimal ? "w-12 h-6 pl-1" : "audiovisualizer"
          )}>
            <BarVisualizer
              barCount={3}
              options={{ minHeight: 5 }}
              trackRef={audioTrackRef}
              className="flex h-4 w-auto items-center justify-center gap-0.5"
            >
              <span
                className={cn([
                  'h-full w-0.5 origin-center rounded-2xl',
                  'group-data-[state=on]/track:bg-foreground group-data-[state=off]/track:bg-destructive',
                  'data-lk-muted:bg-muted',
                ])}
              />
            </BarVisualizer>
          </div>
        )}
      </TrackToggle>
      <hr className={cn(
        "bg-border peer-data-[state=off]/track:bg-destructive/20 relative z-10 -mr-px hidden h-4 w-px border-none has-[~_button]:block",
        minimal && "mx-0.5 opacity-30"
      )} />
      <TrackDeviceSelect
        uiSize="sm"
        kind={kind}
        requestPermissions={false}
        minimal={minimal}
        onMediaDeviceError={onMediaDeviceError}
        onActiveDeviceChange={onActiveDeviceChange}
        className={cn([
          minimal ? 'rounded-full pl-0 -ml-2' : 'rounded-l-none pl-2',
          'peer-data-[state=off]/track:text-destructive',
          'hover:text-foreground focus:text-foreground',
          'hover:peer-data-[state=off]/track:text-foreground',
          'focus:peer-data-[state=off]/track:text-destructive',
        ])}
      />
    </div>
  );
}
