"use client";

import { AtSign, PlusCircle, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (controlsDisabled) {
      setShowEmojiPicker(false);
    }
  }, [controlsDisabled]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!pickerContainerRef.current?.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(`${value}${emojiData.emoji}`);
    setShowEmojiPicker(false);
  };

  return (
    <>
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
            <div className="relative" ref={pickerContainerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                disabled={controlsDisabled}
                className="rounded-full p-1.5 transition-colors hover:bg-zinc-200/80 disabled:pointer-events-none disabled:opacity-40"
                aria-label="Open emoji picker"
              >
                <Smile className="size-5" strokeWidth={1.5} aria-hidden />
              </button>
              {showEmojiPicker ? (
                <div className="absolute bottom-10 left-0 z-30 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    lazyLoadEmojis
                    width={320}
                    height={360}
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled
                  />
                </div>
              ) : null}
            </div>
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
    </>
  );
}
