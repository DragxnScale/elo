import type * as React from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type NoticeTone = "info" | "success" | "warning" | "error";

const tones: Record<
  NoticeTone,
  { box: string; icon: string; Icon: typeof Info }
> = {
  info: { box: "bg-muted", icon: "text-muted-foreground", Icon: Info },
  success: { box: "bg-win-subtle", icon: "text-win", Icon: CircleCheck },
  warning: { box: "bg-warn-subtle", icon: "text-warn", Icon: TriangleAlert },
  error: { box: "bg-loss-subtle", icon: "text-loss", Icon: CircleAlert },
};

export type NoticeProps = Omit<React.ComponentProps<"div">, "title"> & {
  tone?: NoticeTone;
  title?: React.ReactNode;
};

/**
 * An inline message: guidance (signed-out hint), form-level errors, config
 * warnings. A tinted surface and an icon; text stays in the foreground colour.
 * Errors are announced (role="alert"), the rest politely (role="status").
 */
export function Notice({
  tone = "info",
  title,
  className,
  children,
  ...props
}: NoticeProps) {
  const { box, icon, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground",
        box,
        className
      )}
      {...props}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-foreground/85">{children}</div>}
      </div>
    </div>
  );
}
