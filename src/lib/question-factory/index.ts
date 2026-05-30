export type {
  BlueprintGenerationRequest,
  FactoryPipelineResult,
  GeneratedQuestionPack,
  GeneratedVariation,
  QuestionVariationType,
  StoredQuestionPack,
  TutoringReview,
  TutoringReviewInput,
  ValidationIssue,
  ValidationResult,
} from "./types";

export type {
  BlueprintPreset,
  QuestionBlueprint,
  QuestionStyle,
  QuestionSubject,
} from "./blueprint";

export {
  BLUEPRINT_PRESETS,
  blueprintForSkill,
  blueprintFromQuestion,
  buildBlueprintHash,
  buildContentHash,
  normalizeQuestionText,
} from "./blueprint";

export { generateQuestionPack } from "./generator";
export { validateQuestionPack, collectContentHashes } from "./validator";
export {
  buildTutoringReview,
  buildEnhancedTutoringReview,
  enhanceTutoringReviewWithAi,
} from "./tutoring-review";
export {
  ensureSkillQuestionBank,
  generateSimilarQuestion,
  runQuestionFactoryPipeline,
} from "./pipeline";

export {
  countActiveBySkill,
  findExistingByBlueprint,
  findSimilarInBank,
  loadExistingContentHashes,
  storeQuestionPack,
} from "./repository";
