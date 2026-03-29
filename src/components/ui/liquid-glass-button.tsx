import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liquidbuttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold outline-none transition-transform duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[rgba(0,0,0,0.88)] text-white border-2 border-[#2D5A27] shadow-[0_12px_28px_rgba(0,0,0,0.42)]",
        secondary: "bg-white text-[#2D5A27] border-2 border-[#2D5A27]",
      },
      size: {
        default: "px-5 py-3 text-base",
        sm: "px-4 py-2.5 text-sm gap-1.5",
        lg: "px-6 py-3.5 text-base",
        xl: "px-10 py-5 text-xl",
        xxl: "px-12 py-5 text-xl",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xxl",
    },
  }
)

interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidbuttonVariants> {
  asChild?: boolean
}

function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: LiquidButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(liquidbuttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { LiquidButton }
