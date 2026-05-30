import Link from "next/link";
import { Sparkles } from "lucide-react";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "md" | "lg" | "xl";
  /** Where the logo goes. Use false during onboarding so the logo does not look broken. */
  homeHref?: string | false;
};

const widthClass = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
};

const logoMark = (
  <>
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-white">
      <Sparkles className="h-4 w-4" />
    </div>
    <span className="text-[15px] font-semibold tracking-tight">1600</span>
  </>
);

export function AppShell({
  children,
  className,
  maxWidth = "lg",
  homeHref = "/dashboard",
}: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-[#F8F5EF] text-[#111111] selection:bg-[#111111] selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#F8F5EF]" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white to-transparent" />
        <div className="absolute right-[-8rem] top-32 h-80 w-80 rounded-full bg-[#F3E8D7] opacity-80" />
      </div>

      <div className="relative z-10 mx-auto w-full px-5 py-5 md:px-8">
        <header className="mx-auto flex max-w-5xl items-center justify-between rounded-full border border-black/5 bg-white/90 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          {homeHref === false ? (
            <div className="flex items-center gap-3" aria-label="1600">
              {logoMark}
            </div>
          ) : (
            <Link
              href={homeHref}
              prefetch
              aria-label="Back to dashboard"
              className="flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
            >
              {logoMark}
            </Link>
          )}
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              className="h-9 rounded-full border-black/10 text-[13px] text-black/70 hover:bg-black/5"
            >
              Sign out
            </Button>
          </form>
        </header>

        <main className={cn("relative mx-auto pt-10 pb-16", widthClass[maxWidth], className)}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10">
      {eyebrow ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-black/45">{eyebrow}</p>
      ) : null}
      <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#0B0B0D] md:text-5xl">{title}</h1>
      {description ? <p className="mt-4 max-w-xl text-lg leading-8 text-black/55">{description}</p> : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-black/5 bg-white p-6 shadow-[0_12px_50px_rgba(0,0,0,0.05)] md:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}
