import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Terracota FABRIK (synced with Fabrik Performance)
        default: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg active:bg-primary/95",
        
        // Destructive - Vermelho discreto
        destructive: "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg active:bg-destructive/95",
        
        // Outline - Borda com hover (synced with Fabrik Performance)
        outline: "border-2 border-border bg-background text-foreground shadow-sm hover:bg-accent hover:border-primary/30 hover:shadow-md",
        
        // Secondary - Cinza neutro
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-muted hover:shadow-md active:bg-muted/80",
        
        // Ghost - Transparente com hover sutil
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        
        // Link - Estilo texto
        link: "text-primary underline-offset-4 hover:underline",
        
        // Premium - Botão terracota com efeito premium (synced with Fabrik Performance)
        premium: "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg active:shadow-md",
        
        // Subtle - Para ações secundárias discretas
        subtle: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-md px-10 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
