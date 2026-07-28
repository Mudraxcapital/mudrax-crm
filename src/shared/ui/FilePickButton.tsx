"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button, type ButtonSize } from "./Button";
import { cn } from "./cn";

export function FilePickButton({
  name,
  accept,
  required,
  disabled,
  buttonLabel = "Choose photo",
  changeLabel = "Change photo",
  hint = "JPEG, PNG, or WebP",
  size = "sm",
  className,
  children,
}: {
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  buttonLabel?: string;
  changeLabel?: string;
  hint?: string;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const next = event.target.files?.[0]?.name ?? null;
          setFileName(next);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size={size}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {fileName ? changeLabel : buttonLabel}
        </Button>
        {children}
      </div>
      <span className="text-muted text-xs" title={fileName ?? undefined}>
        {fileName ? (
          <span className="block truncate">{fileName}</span>
        ) : (
          hint
        )}
      </span>
    </div>
  );
}
