import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionData } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { SessionRunner } from "@/components/session-runner";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: sessionId } = await searchParams;
  if (!sessionId) redirect("/dashboard");

  const data = await getSessionData(sessionId);
  if (!data) redirect("/login");

  if ("error" in data && data.error) {
    return (
      <AppShell maxWidth="lg" homeHref="/dashboard">
        <div className="mx-auto max-w-lg py-16 text-center">
          <h1 className="text-xl font-semibold text-black/90">Session unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-black/60">{data.error}</p>
          <Button asChild className="mt-6 rounded-full bg-[#111111] text-white hover:bg-black/90">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!("session" in data) || !data.session) redirect("/dashboard");

  const {
    session,
    questionsById,
    studyMode,
    focusSkill,
    studyMinutes,
    studyTrackLabel,
    foundationReadiness,
    sessionAttempts,
  } = data;

  return (
    <AppShell maxWidth="lg" homeHref="/dashboard">
      <SessionRunner
        key={`${sessionId}-${session.current_phase}`}
        sessionId={sessionId}
        currentPhase={session.current_phase}
        phasePlan={session.phase_plan}
        questionsById={questionsById}
        studyMode={studyMode}
        focusSkill={focusSkill}
        studyMinutes={studyMinutes}
        studyTrackLabel={studyTrackLabel}
        foundationReadiness={foundationReadiness}
        sessionAttempts={sessionAttempts}
      />
    </AppShell>
  );
}
