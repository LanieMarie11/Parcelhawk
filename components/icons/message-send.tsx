type MessageSendIconProps = {
  /** Tailwind text color (e.g. `text-white`, `text-zinc-600`) — stroke uses `currentColor`. */
  className?: string;
};

export default function MessageSendIcon({ className = "text-[#373940]" }: MessageSendIconProps) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6.34743 9.14128L14.515 0.97671M6.5796 9.50844L8.4316 13.2125C8.87918 14.1076 9.10293 14.5552 9.38485 14.6752C9.62951 14.7794 9.90918 14.7604 10.1377 14.6244C10.4009 14.4677 10.5626 13.9941 10.886 13.047L14.3853 2.79914C14.6671 1.97394 14.8079 1.56133 14.7115 1.28838C14.6276 1.05093 14.4408 0.864143 14.2034 0.780252C13.9304 0.683818 13.5178 0.82471 12.6926 1.10649L2.44471 4.60578C1.49763 4.92917 1.02409 5.09087 0.867331 5.35413C0.731289 5.58259 0.712439 5.86225 0.816589 6.10686C0.936606 6.38878 1.38416 6.61261 2.27928 7.06011L5.98332 8.91219C6.13085 8.98594 6.2046 9.02278 6.26843 9.07203C6.32518 9.11578 6.37601 9.16661 6.41968 9.22328C6.46901 9.28719 6.50585 9.36094 6.5796 9.50844Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
