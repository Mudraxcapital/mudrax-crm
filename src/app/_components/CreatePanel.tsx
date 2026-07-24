"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { Drawer } from "@/shared/ui/Drawer";

/** Opens create/edit workflows in a side drawer instead of inline page clutter. */
export function CreatePanel({
  triggerLabel,
  title,
  description,
  children,
  width = "md",
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        width={width}
      >
        {children}
      </Drawer>
    </>
  );
}
