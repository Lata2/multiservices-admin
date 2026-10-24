import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, padded = true, interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean; interactive?: boolean }) {
  return <div className={cn('min-w-0 rounded-card border border-line bg-surface shadow-card', padded && 'p-4 sm:p-5', interactive && 'card-hover cursor-pointer', className)} {...rest} />;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 className="text-md font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Section({ title, subtitle, action, children, className }: { title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      {title ? <CardHeader title={title} subtitle={subtitle} action={action} /> : null}
      {children}
    </Card>
  );
}
