export type UserRole = "student" | "admin";

export type ArtifactType = "parsons" | "tracing" | "mutation" | "flashcard";
export type AssessmentType = "pretest" | "posttest";

export type Difficulty = "easy" | "moderate" | "hard";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  group?: "adaptive" | "static";
}

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  concept: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  prompt: string;
  hints?: string[];
  starterCode?: string;
  bugLineNo?: number;
  bugLineFixExample?: string;
  lines?: string[];
  solutionOrder?: number[];
  options?: Array<{ id: string; label: string }>;
  answerOptionId?: string;
  traceTable?: Array<{ step: number; expression: string; expected: string }>;
  tags: string[];
  conceptExplanation?: string | null;
  lineAnnotations?: string[];
  solutionExplanation?: string | null;
}

export interface DashboardStudent {
  user: UserProfile;
  streakDays: number;
  completedArtifacts: number;
  totalArtifacts: number;
  avgMinutes: number;
  recommendationMode: "adaptive" | "static";
  nextArtifactId: string | null;
  conceptMastery: Array<{ concept: string; mastery: number }>;
  dailyTrend: Array<{ day: string; score: number }>;
  assessmentStatus?: {
    pretestCompleted: boolean;
    posttestCompleted: boolean;
    pretestWindowOpen?: boolean;
    posttestWindowOpen?: boolean;
    pretestAttemptOpen?: boolean;
    posttestAttemptOpen?: boolean;
    pretestDueAt?: string;
    posttestDueAt?: string;
  };
  studyPhase?: "pretest" | "intervention" | "posttest" | "survey";
}

export interface StudentProtocolOverride {
  forceStudyPhase?: "pretest" | "intervention" | "posttest" | "survey";
  forcePretestWindowOpen?: boolean;
  forcePosttestWindowOpen?: boolean;
  pretestDueAt?: string;
  posttestDueAt?: string;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface StudentProtocolOverrideInput {
  forceStudyPhase?: "pretest" | "intervention" | "posttest" | "survey";
  forcePretestWindowOpen?: boolean;
  forcePosttestWindowOpen?: boolean;
  pretestDueAt?: string;
  posttestDueAt?: string;
  note?: string;
}

export interface StudentProtocolControl {
  userId: string;
  assessmentStatus: NonNullable<DashboardStudent["assessmentStatus"]>;
  studyPhase: NonNullable<DashboardStudent["studyPhase"]>;
  override?: StudentProtocolOverride;
}

export interface StudentProtocolOverrideAuditEntry {
  id: number;
  userId: string;
  changedAt: string;
  changedBy?: string;
  before?: StudentProtocolOverride;
  after?: StudentProtocolOverride;
}

export interface StudentProgressSummary {
  userId: string;
  activityCount: number;
  pretestSubmitted: boolean;
  posttestSubmitted: boolean;
  openAttempts: string[];
  bktConcepts: { concept: string; pKnow: number }[];
}

export interface StudentProgressClearResult {
  userId: string;
  cleared: string;
  deletedRows: number;
}

export interface StudentHistoryRow {
  artifactId: string;
  artifactTitle: string;
  type: ArtifactType;
  concept: string;
  attempts: number;
  hintsUsed: number;
  durationMin: number;
  correctness: number;
  completedAt: string;
  attemptNumber?: number;
}

export interface ArtifactCompletionInput {
  userId: string;
  attempts: number;
  hintsUsed: number;
  durationMs: number;
  correctness: number;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; label: string }>;
  concept?: string;
  difficulty?: Difficulty;
  correctOptionId?: string;
}

export interface AssessmentDefinition {
  type: AssessmentType;
  title: string;
  version: string;
  updatedAt: string;
  questions: AssessmentQuestion[];
}

export interface AssessmentItemAttempt {
  questionId: string;
  selectedOptionId: string;
  durationMs: number;
  order: number;
}

export interface AssessmentSubmissionInput {
  userId: string;
  assessmentType: AssessmentType;
  /** Required for student submissions. Admins may omit to bypass the attempt-token check. */
  attemptId?: string;
  startedAt: string;
  completedAt: string;
  items: AssessmentItemAttempt[];
}

export interface AssessmentSubmissionResult {
  id: string;
  assessmentType: AssessmentType;
  submittedAt: string;
  totalItems: number;
  answeredItems: number;
  totalDurationMs: number;
  score?: number;
}

export interface AssessmentSubmissionAdminRow {
  id: string;
  userId: string;
  group?: "adaptive" | "static";
  assessmentType: AssessmentType;
  startedAt: string;
  completedAt: string;
  submittedAt: string;
  totalItems: number;
  answeredItems: number;
  totalDurationMs: number;
  score?: number;
  items: AssessmentItemAttempt[];
}

export interface AssessmentSubmissionListQuery {
  page: number;
  pageSize: number;
  assessmentType?: AssessmentType | "all";
  group?: "adaptive" | "static" | "all";
  userId?: string;
}

export interface AssessmentGainRow {
  userId: string;
  group?: "adaptive" | "static";
  pretestScore?: number;
  posttestScore?: number;
  gain?: number;
  pretestDurationMs?: number;
  posttestDurationMs?: number;
  pretestSubmittedAt?: string;
  posttestSubmittedAt?: string;
}

export interface AssessmentGainSummary {
  totalStudents: number;
  studentsWithBoth: number;
  adaptiveWithBoth: number;
  staticWithBoth: number;
  adaptiveMeanPretest?: number;
  adaptiveMeanPosttest?: number;
  adaptiveMeanGain?: number;
  staticMeanPretest?: number;
  staticMeanPosttest?: number;
  staticMeanGain?: number;
  deltaMeanGain?: number;
}

export interface AssessmentGainAnalytics {
  summary: AssessmentGainSummary;
  rows: AssessmentGainRow[];
}

export interface AssessmentItemStatRow {
  questionId: string;
  concept?: string;
  difficulty?: Difficulty;
  responses: number;
  correctCount?: number;
  correctRate?: number;
  avgDurationMs?: number;
}

export interface AssessmentItemStats {
  assessmentType: AssessmentType;
  totalSubmissions: number;
  totalResponses: number;
  overallCorrectRate?: number;
  overallAvgDurationMs?: number;
  rows: AssessmentItemStatRow[];
}

export interface AssessmentAttemptSession {
  attemptId: string;
  assessmentType: AssessmentType;
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
  status: "open" | "completed" | "expired";
}

export interface AssessmentDraftInput {
  items: AssessmentItemAttempt[];
}

export interface AssessmentDraft {
  attemptId: string;
  assessmentType: AssessmentType;
  updatedAt: string;
  items: AssessmentItemAttempt[];
}

export interface AssessmentUploadInput {
  assessmentType: AssessmentType;
  title: string;
  version: string;
  questions: AssessmentQuestion[];
}

export interface SurveyQuestion {
  id: string;
  label: string;
  questionType: string;
  section?: string | null;
  min: number;
  max: number;
  minLabel?: string | null;
  maxLabel?: string | null;
}

export interface SurveyQuestionInput {
  id: string;
  label: string;
  questionType: string;
  section?: string | null;
  min: number;
  max: number;
  minLabel?: string | null;
  maxLabel?: string | null;
  displayOrder: number;
}

export interface SurveyResponseItem {
  questionId: string;
  value?: number | null;
  textValue?: string | null;
}

export interface SurveyResponseRow {
  userId: string;
  userName: string;
  questionId: string;
  questionLabel: string;
  section?: string | null;
  questionType: string;
  value?: number | null;
  textValue?: string | null;
  submittedAt: string;
}

export interface SurveySubmissionInput {
  responses: SurveyResponseItem[];
}

export interface SurveySubmissionResult {
  ok: boolean;
  submittedAt: string;
}

export interface RiskAlert {
  id: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export interface OutcomePoint {
  week: string;
  adaptive: number;
  static: number;
}

export interface AdminOverview {
  activeStudents: number;
  completionRate: number;
  avgGain: number;
  adaptiveVsStaticDelta: number;
  riskAlerts: RiskAlert[];
  outcomes: OutcomePoint[];
}

export type OperationalAlertSource =
  | "invite_email"
  | "async_jobs"
  | "telemetry"
  | "artifact_generation"
  | "flags";

export interface OperationalAlert {
  id: string;
  source: OperationalAlertSource;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  observedAt: string;
  windowHours: number;
  metric?: number;
  threshold?: number;
}

export interface OperationalAlertCounts {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export interface OperationalAlertsSummary {
  generatedAt: string;
  windowHours: number;
  counts: OperationalAlertCounts;
  alerts: OperationalAlert[];
}

export interface ApiResult<T> {
  data: T;
  source: "live";
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ArtifactListQuery {
  page: number;
  pageSize: number;
  search?: string;
  type?: ArtifactType | "all";
  difficulty?: Difficulty | "all";
  concept?: string;
  missingContent?: boolean;
  sortBy?: "title" | "type" | "difficulty" | "concept";
  sortDir?: "asc" | "desc";
}

export interface StudentListQuery {
  page: number;
  pageSize: number;
  search?: string;
  group?: "adaptive" | "static" | "all";
}

export interface StudentProtocolAuditListQuery {
  page: number;
  pageSize: number;
}

export interface StudentInviteListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: StudentInvite["status"] | "all";
  group?: "adaptive" | "static" | "all";
}

export interface ArtifactIssueReportListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: ArtifactIssueReport["status"] | "all";
  reason?: ArtifactIssueInput["reason"] | "all";
  userId?: string;
  artifactId?: string;
}

export interface StudentHistoryListQuery {
  page: number;
  pageSize: number;
  search?: string;
}

export interface TelemetryEvent {
  userId: string;
  role: UserRole;
  artifactId?: string;
  artifactType?: ArtifactType;
  concept?: string;
  subskillTags?: string[];
  difficulty?: Difficulty;
  recommendationMode?: "adaptive" | "static";
  sequencePosition?: number;
  event: string;
  attempt?: number;
  hintsUsed?: number;
  durationMs?: number;
  correctness?: number;
  responseSummary?: string;
  payload?: Record<string, unknown>;
  ts: string;
}

export interface TelemetryEventRecord extends TelemetryEvent {
  id: string;
  group?: "adaptive" | "static";
}

export interface TelemetryEventListQuery {
  page: number;
  pageSize: number;
  search?: string;
  event?: string | "all";
  role?: UserRole | "all";
  group?: "adaptive" | "static" | "all";
  artifactType?: ArtifactType | "all";
  concept?: string;
  fromTs?: string;
  toTs?: string;
  userId?: string;
}

export interface TelemetrySummary {
  totalEvents: number;
  uniqueLearners: number;
  avgDurationMs: number;
  hintEvents: number;
  submitEvents: number;
  flaggedEvents: number;
  assessmentItemEvents: number;
  adaptiveEvents: number;
  staticEvents: number;
  topEventTypes: Array<{ event: string; count: number }>;
  topConcepts: Array<{ concept: string; count: number }>;
}

export interface StudentInviteInput {
  name: string;
  email: string;
  group?: "adaptive" | "static";
}

export interface UpdateStudentInput {
  name?: string;
  email?: string;
  group?: "adaptive" | "static";
  password?: string;
}

export interface UpdateSelfInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface StudentInvite {
  id: string;
  name: string;
  email: string;
  group: "adaptive" | "static";
  status: "invited" | "accepted" | "expired";
  invitedAt: string;
}

export interface InviteAcceptInput {
  email: string;
  password: string;
  name?: string;
}

export interface ArtifactIssueInput {
  artifactId: string;
  artifactType: ArtifactType;
  userId?: string;
  role?: UserRole;
  reason: "incorrect_feedback" | "broken_logic" | "unclear_instruction" | "other";
  note?: string;
  hintsUsed?: number;
  attempt?: number;
}

export interface ArtifactIssueReport extends ArtifactIssueInput {
  id: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  status: "open" | "reviewed" | "resolved";
  statusUpdatedBy?: string;
  statusUpdatedAt?: string;
  statusNote?: string;
}

export interface ArtifactIssueStatusUpdateInput {
  status: ArtifactIssueReport["status"];
  statusNote?: string;
}

export interface CorpusDatasetSummary {
  id: string;
  name: string;
  description?: string;
  chunkingMethod: "castplus" | "cast" | "fixed";
  status: "uploaded" | "chunked" | "failed";
  ragStatus: "pending" | "indexing" | "indexed" | "failed";
  sourceCount: number;
  chunkCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CorpusChunkPreview {
  id: string;
  documentPath: string;
  chunkIndex: number;
  chunkType: string;
  startLine?: number;
  endLine?: number;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface CorpusUploadResponse {
  dataset: CorpusDatasetSummary;
  filesAccepted: number;
  documentsCreated: number;
}

export interface ArtifactGenerationRequest {
  corpusDatasetId: string;
  artifactType: ArtifactType;
  concept: string;
  difficulty: Difficulty;
  count?: number;
  temperature?: number;
  maxContextChars?: number;
}

export interface ArtifactGenerationResult {
  artifact: Artifact;
  sourceChunkIds: string[];
  model: string;
}

export interface ArtifactCheckInput {
  answerType: "mutation" | "tracing";
  patchedLine?: string;           // mutation: the student's fixed line
  answers?: Record<string, string>; // tracing: { stepStr: valueStr }
}

export interface ArtifactCheckResult {
  correct: boolean;
  score: number; // 0.0–1.0
}

export interface GeminiHealth {
  configured: boolean;
  reachable: boolean;
  /** The currently active model (from DB setting or env config). */
  activeModel: string;
  /** All Gemini models that support generateContent. Empty when unreachable. */
  availableModels: string[];
  error: string | null;
}

export interface AsyncJobSummary {
  id: string;
  jobType: "corpus_chunk" | "artifact_generate" | "artifact_generate_batch" | "embed_corpus";
  status: "queued" | "running" | "succeeded" | "failed";
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  attemptCount: number;
  maxAttempts: number;
  runAt: string;
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
}

export interface AsyncJobDispatchSummary {
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
}

export interface ArtifactCoverageCell {
  concept: string;
  type: ArtifactType;
  difficulty: Difficulty;
  count: number;
}

export interface ArtifactDuplicateEntry {
  id: string;
  title: string;
}

export interface ArtifactDuplicateGroup {
  concept: string;
  type: ArtifactType;
  difficulty: Difficulty;
  title: string;
  artifacts: ArtifactDuplicateEntry[];
}
