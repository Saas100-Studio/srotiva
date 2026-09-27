import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
  action,
  labelledBy,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action: ReactNode;
  labelledBy: string;
  className?: string;
}) {
  return (
    <section
      className={`empty-state ${className}`.trim()}
      aria-labelledby={labelledBy}
    >
      <h2 id={labelledBy}>{title}</h2>
      <div className="state-copy">{children}</div>
      {action}
    </section>
  );
}
