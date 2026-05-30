import { redirect } from "next/navigation";
import { getDashboardData } from "@/app/actions";
import { DashboardView } from "@/components/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  if (!data) redirect("/login");

  if (data.error && !data.profile) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-black/90">Setup needed</h1>
        <p className="mt-3 text-sm leading-7 text-black/60">{data.error}</p>
      </div>
    );
  }

  if (!data.profile) redirect("/login");

  return (
    <DashboardView
      profile={data.profile}
      weakAreas={data.weakAreas}
      improvingSkills={data.improvingSkills}
      skillInsights={data.skillInsights}
      conceptGaps={data.conceptGaps}
      reviewRecommendations={data.reviewRecommendations}
      timingIssues={data.timingIssues}
      recentMistakes={data.recentMistakes}
      recentSessions={data.recentSessions}
      streak={data.streak}
      estimatedProgress={data.estimatedProgress}
      gradePathProgress={data.gradePathProgress}
      recommendedSessionLabel={data.recommendedSessionLabel}
      nextStudy={data.nextStudy}
      learningPhaseLabel={data.learningPhaseLabel}
    />
  );
}
