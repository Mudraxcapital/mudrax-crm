import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "mx-btn-primary",
  secondary: "mx-btn-secondary",
  ghost: "mx-btn-ghost",
  danger: "mx-btn-danger",
  outline: "mx-btn-secondary",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "mx-btn-sm",
  md: "",
  lg: "mx-btn-lg",
  icon: "mx-btn-sm !px-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading,
    disabled,
    leftIcon,
    rightIcon,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn("mx-btn", variantClass[variant], sizeClass[size], className)}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  );
});
