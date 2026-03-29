import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-secondary text-secondary-foreground border border-border',
        destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
        success: 'bg-nitrogen/10 text-nitrogen border border-nitrogen/20',
        warning: 'bg-potassium/10 text-potassium border border-potassium/20',
        outline: 'text-foreground border border-border',
        ghost: 'text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface ScanBadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function ScanBadge({ className, variant, ...props }: ScanBadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
