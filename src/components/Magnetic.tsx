import { type ReactNode } from "react";
import { useApp } from "@/lib/app-context";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** use white outline (for blue scenes) */
  onDark?: boolean;
  className?: string;
  strength?: number;
  ariaLabel?: string;
  target?: string;
};

/**
 * Outline CTA button/link (rule 0 + spec 4.7: text NEVER moves on hover or click).
 * Hover sweeps the lime fill in and grows a 1px underline left → right in 0.25s.
 */
export default function Magnetic({
  children,
  href,
  onClick,
  onDark = false,
  className = "",
  ariaLabel,
  target,
}: Props) {
  const { tick } = useApp();
  const Comp = href ? "a" : "button";

  return (
    <Comp
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer noopener" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      data-ui
      onPointerEnter={() => tick(1420)}
      className={`mono group relative inline-flex select-none items-center justify-center px-6 py-4 ${className}`}
    >
      <span
        className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[450ms] group-hover:scale-y-100 group-focus-visible:scale-y-100"
        style={{ background: "#c6ff00", transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
      />
      <span
        className="absolute inset-0 border"
        style={{ borderColor: onDark ? "rgba(255,255,255,0.5)" : "var(--card-border)" }}
      />
      <span className="link-line relative z-10 transition-colors duration-250 group-hover:text-[#05060a] group-focus-visible:text-[#05060a]">
        {children}
      </span>
    </Comp>
  );
}
