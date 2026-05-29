"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PLAIN_TEXT_COLLAPSE_THRESHOLD = 120;

function looksLikeHtml(value: string): boolean {
  return /<(?:p|br|strong|b|em|i|ul|ol|li|span|div|h[1-6])\b/i.test(value);
}

/** Strip unsafe markup while keeping basic formatting tags. */
export function sanitizeProfileHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s(on\w+|javascript:)=["'][^"']*["']/gi, "")
    .replace(/<(iframe|object|embed|form|input|button|link|meta)\b[^>]*>/gi, "");
}

function plainTextLength(value: string): string {
  if (looksLikeHtml(value)) {
    return value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .trim();
  }
  return value.trim();
}

function renderInlineFormatting(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function ProfilePlainFormatted({ text }: { text: string }) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        return (
          <p key={blockIndex} className={blockIndex > 0 ? "mt-2" : undefined}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInlineFormatting(line, `${blockIndex}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

const richTextClassName =
  "text-xs font-normal leading-relaxed text-[#1f2937] [&_b]:font-semibold [&_strong]:font-semibold [&_em]:italic [&_i]:italic [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mt-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_li+_li]:mt-0.5 [&_p+p]:mt-2 [&_br]:block";

type ProfileRichTextProps = {
  content?: string;
  className?: string;
  emptyClassName?: string;
  collapseThreshold?: number;
  collapsedLines?: number;
};

export function ProfileRichText({
  content,
  className,
  emptyClassName = "text-xs font-normal text-[#1f2937]",
  collapseThreshold = PLAIN_TEXT_COLLAPSE_THRESHOLD,
  collapsedLines = 6,
}: ProfileRichTextProps) {
  const [expanded, setExpanded] = useState(false);
  const text = content?.trim() ?? "";
  const isHtml = looksLikeHtml(text);
  const plain = plainTextLength(text);
  const isLong = plain.length > collapseThreshold;

  useEffect(() => {
    setExpanded(false);
  }, [content]);

  if (!text) {
    return <span className={emptyClassName}>-</span>;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={richTextClassName}
        style={
          !expanded && isLong
            ? {
                display: "-webkit-box",
                WebkitLineClamp: collapsedLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {isHtml ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizeProfileHtml(text) }} />
        ) : (
          <ProfilePlainFormatted text={text} />
        )}
      </div>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 text-xs font-medium text-[#00A6E8] hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
