import { cn } from "cn";

interface ProgressRingProps {
  /** Share done, 0..1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Show the percentage inside the ring. */
  showValue?: boolean;
  className?: string;
}

export function ProgressRing({
  value,
  size = 40,
  strokeWidth = 4,
  showValue = true,
  className,
}: ProgressRingProps) {
  const share = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = Math.round(share * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <span
      role="img"
      aria-label={`Пройдено ${percent}%`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-line"
        />
        {share > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
            className={share >= 1 ? "text-success" : "text-lilac"}
          />
        )}
      </svg>
      {showValue && (
        <span
          aria-hidden
          className="absolute font-mono font-medium text-ink tabular-nums"
          style={{ fontSize: Math.max(9, Math.round(size * 0.24)) }}
        >
          {percent}
        </span>
      )}
    </span>
  );
}
