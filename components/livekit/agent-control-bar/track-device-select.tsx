'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { cva } from 'class-variance-authority';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { useMaybeRoomContext, useMediaDeviceSelect } from '@livekit/components-react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/utils';

type DeviceSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  kind: MediaDeviceKind;
  uiSize?: 'default' | 'sm';
  track?: LocalAudioTrack | LocalVideoTrack | undefined;
  requestPermissions?: boolean;
  onMediaDeviceError?: (error: Error) => void;
  onDeviceListChange?: (devices: MediaDeviceInfo[]) => void;
  onActiveDeviceChange?: (deviceId: string) => void;
  minimal?: boolean;
};

const selectVariants = cva(
  'w-full rounded-full px-3 py-2 text-sm cursor-pointer disabled:not-allowed',
  {
    variants: {
      uiSize: {
        default: 'w-[180px]',
        sm: 'w-auto',
      },
    },
    defaultVariants: {
      uiSize: 'default',
    },
  }
);

export function TrackDeviceSelect({
  kind,
  track,
  uiSize = 'default',
  requestPermissions = false,
  onMediaDeviceError,
  onDeviceListChange,
  onActiveDeviceChange,
  minimal = false,
  ...props
}: DeviceSelectProps) {
  const room = useMaybeRoomContext();
  const [requestPermissionsState, setRequestPermissionsState] = useState(requestPermissions);
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({
    room,
    kind,
    track,
    requestPermissions: requestPermissionsState,
    onError: onMediaDeviceError,
  });

  useEffect(() => {
    onDeviceListChange?.(devices);
  }, [devices, onDeviceListChange]);

  const handleActiveDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setActiveMediaDevice(deviceId);
    onActiveDeviceChange?.(deviceId);
  };

  const filteredDevices = useMemo(() => devices.filter((d) => d.deviceId !== ''), [devices]);
  const hasMultipleDevices = filteredDevices.length >= 2;

  return (
    <div className={cn(
      "relative flex items-center transition-all duration-300",
      minimal ? "w-6" : "w-auto"
    )}>
      {/* 
          Main Select Element 
          In minimal mode, we make it transparent and overlay it on the icon
      */}
      <select
        value={activeDeviceId}
        onChange={handleActiveDeviceChange}
        disabled={!hasMultipleDevices}
        onFocus={() => setRequestPermissionsState(true)}
        className={cn(
          selectVariants({ uiSize }),
          'appearance-none pr-8 focus:outline-none cursor-pointer',
          minimal && 'absolute inset-0 w-full h-full opacity-0 z-20 pr-0', // Transparent overlay in minimal mode
          !hasMultipleDevices && 'cursor-default',
          props.className
        )}
      >
        {filteredDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Device ${device.deviceId.slice(0, 4)}`}
          </option>
        ))}
      </select>

      {/* Visual Chevron - rendered behind the transparent select in minimal mode */}
      {hasMultipleDevices && (
        <CaretDownIcon
          weight="bold"
          className={cn(
            "pointer-events-none transition-colors text-muted-foreground",
            minimal ? "relative z-10 size-2.5 mx-auto" : "absolute right-3 size-3"
          )}
        />
      )}
    </div>
  );
}
