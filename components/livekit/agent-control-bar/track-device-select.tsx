'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { cva } from 'class-variance-authority';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';
import { useMaybeRoomContext, useMediaDeviceSelect } from '@livekit/components-react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/utils';

type DeviceSelectProps = React.ComponentProps<'select'> & {
  kind: MediaDeviceKind;
  variant?: 'default' | 'small';
  track?: LocalAudioTrack | LocalVideoTrack | undefined;
  requestPermissions?: boolean;
  onMediaDeviceError?: (error: Error) => void;
  onDeviceListChange?: (devices: MediaDeviceInfo[]) => void;
  onActiveDeviceChange?: (deviceId: string) => void;
};

const selectVariants = cva(
  'w-full rounded-full px-3 py-2 text-sm cursor-pointer disabled:not-allowed',
  {
    variants: {
      size: {
        default: 'w-[180px]',
        sm: 'w-auto',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export function TrackDeviceSelect({
  kind,
  track,
  size = 'default',
  requestPermissions = false,
  onMediaDeviceError,
  onDeviceListChange,
  onActiveDeviceChange,
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

  if (filteredDevices.length < 2) {
    return null;
  }

  return (
    <div className="relative flex items-center">
      <select
        value={activeDeviceId}
        onChange={handleActiveDeviceChange}
        onFocus={() => setRequestPermissionsState(true)}
        className={cn(
          selectVariants({ size }),
          'appearance-none pr-8 focus:outline-none',
          props.className
        )}
      >
        {filteredDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId} className="bg-background">
            {device.label || `Device ${device.deviceId.slice(0, 4)}`}
          </option>
        ))}
      </select>
      <CaretDownIcon
        weight="bold"
        className="pointer-events-none absolute right-3 size-3 transition-colors text-muted-foreground"
      />
    </div>
  );
}
