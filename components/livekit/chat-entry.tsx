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
    </li >
  );
};
