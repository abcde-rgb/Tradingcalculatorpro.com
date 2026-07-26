import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * EmptyState — what a card shows before the user has entered anything.
 *
 * "Sin datos" centred in grey reads as *broken*, not as *new*. Showing a faded
 * preview of the real thing plus one action tells the user two things at once:
 * nothing is wrong, and here is exactly what will appear here.
 *
 * Props:
 *  - icon:    lucide component for the header
 *  - title:   what goes here (short)
 *  - hint:    one line on how it fills up
 *  - preview: optional faded sample of the real content
 *  - to/cta:  optional call to action (router link)
 *  - onAction/actionLabel: optional inline action instead of a link
 */
export default function EmptyState({
  icon: Icon,
  title,
  hint,
  preview,
  to,
  cta,
  onAction,
  actionLabel,
  className = '',
}) {
  return (
    <div className={`py-6 text-center ${className}`} data-testid="empty-state">
      {preview && (
        // Inert and faded: it's an illustration of the real thing, never
        // mistakable for actual user data.
        <div
          className="mb-4 opacity-35 blur-[0.4px] pointer-events-none select-none"
          aria-hidden="true"
        >
          {preview}
        </div>
      )}

      {Icon && (
        <div className="mx-auto mb-3 w-11 h-11 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">{hint}</p>
      )}

      {to && cta && (
        <Button asChild size="sm" variant="outline" className="mt-4 gap-1.5">
          <Link to={to}>{cta} <ArrowRight className="w-3.5 h-3.5" /></Link>
        </Button>
      )}
      {onAction && actionLabel && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
