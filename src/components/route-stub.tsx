import type { ReactNode } from "react";

export function RouteStub({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-4 md:px-10 md:pt-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>

      <div className="mt-8 rounded-2xl border border-hairline bg-card/60 p-8 backdrop-blur-sm">
        {children ?? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="h-10 w-10 rounded-lg bg-primary/15 ring-hairline" />
            <p className="font-display text-lg">Coming in the next phase</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              The foundation is set. This screen is next in the build plan —
              real content lands soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
