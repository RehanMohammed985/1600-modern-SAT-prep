export { computeSkillIntelligence, computeSkillScore, type SkillMetrics } from "./skill-score";

export {
  pickAdaptiveFocusSkill,
  buildAdaptiveSessionPlan,
} from "./adaptive";

export {
  getWeakAreasFromMetrics,
  getImprovingFromMetrics,
  detectTimingIssues,
  detectConceptGaps,
  buildReviewRecommendations,
  adaptiveStudyMessage,
  type ReviewRecommendation,
} from "./insights";

export {
  prioritizeFactoryQuestions,
  supplyQuestionsForSkill,
  adaptiveDifficultyForScore,
} from "./question-supply";

export {
  bayesianUpdate,
  initialSkillState,
  applyForgettingDecay,
  buildSkillStateFromAttempts,
  computeAdaptiveDifficulty,
  estimateTotalScore,
  skillMasteryLevel,
  type SkillState,
  type BKTParams,
  type BKTUpdateResult,
} from "./knowledge-tracing";

export {
  computeItemStats,
  computeItemInformation,
  probabilityCorrect,
  estimateTheta,
  selectBestItem,
  thetaToScore,
  scoreToTheta,
  type ItemParams,
  type ItemStats,
} from "./item-response";

export {
  predictScore,
  estimateScoreFromStats,
  daysToTarget,
  scoreGoalLabel,
  type ScorePrediction,
} from "./score-prediction";

export {
  sm2Schedule,
  defaultReviewCard,
  computeReviewQuality,
  getOverdueCards,
  getUpcomingCards,
  buildReviewCardFromAttempts,
  type ReviewCard,
  type ReviewQuality,
} from "./spaced-repetition";

export {
  buildMistakePatterns,
  detectPatternClusters,
  getMistakeTrend,
  getTopMistakeSkills,
  mistakeRecoveryRate,
  type MistakePattern,
  type MistakeCluster,
} from "./mistake-patterns";

export {
  generateWeeklyPlan,
  generateStudyPlanSummary,
  type WeeklyPlan,
  type StudyPlanDay,
} from "./study-planner";
