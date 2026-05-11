"use client";

import { AtSign, PlusCircle, Smile } from "lucide-react";
import MessageSendIcon from "@/components/icons/message-send";

type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  inputDisabled?: boolean;
  controlsDisabled?: boolean;
  sendDisabled?: boolean;
  placeholder?: string;
};

export function MessageComposer({
  value,
  onChange,
  onSend,
  inputDisabled = false,
  controlsDisabled = false,
  sendDisabled = false,
  placeholder = "Type a message...",
}: MessageComposerProps) {
  return (
    <div className="shrink-0 border-t border-zinc-200 p-4">
      <div className="relative rounded-lg border border-zinc-300 bg-zinc-50 focus-within:border-zinc-400">
        <div className="px-3 pb-12 pr-28 pt-3">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            disabled={inputDisabled}
            rows={4}
            className="block h-20 w-full resize-none overflow-y-auto border-0 bg-transparent p-0 align-top text-sm leading-5 outline-none ring-0 ring-offset-0 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-0.5 text-zinc-500">
          <button
            type="button"
            disabled={controlsDisabled}
            className="rounded-full p-1.5 transition-colors hover:bg-zinc-200/80 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Add attachment"
          >
            <PlusCircle className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            disabled={controlsDisabled}
            className="rounded-full p-1.5 transition-colors hover:bg-zinc-200/80 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Emoji"
          >
            <Smile className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            disabled={controlsDisabled}
            className="rounded-full p-1.5 transition-colors hover:bg-zinc-200/80 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Mention"
          >
            <AtSign className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          className="absolute bottom-3 right-3 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#3f6f39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345f30] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send <MessageSendIcon className="shrink-0 text-white" />
        </button>
      </div>
    </div>
  );
}
