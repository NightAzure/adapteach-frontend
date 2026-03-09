import {
  AdminOverview,
  AsyncJobDispatchSummary,
  AsyncJobSummary,
  ApiResult,
  Artifact,
  ArtifactCheckInput,
  ArtifactCheckResult,
  ArtifactCompletionInput,
  ArtifactCoverageCell,
  ArtifactIssueInput,
  ArtifactIssueReport,
  ArtifactIssueStatusUpdateInput,
  ArtifactGenerationRequest,
  ArtifactGenerationResult,
  AssessmentDefinition,
  AssessmentDraft,
  AssessmentAttemptSession,
  AssessmentSubmissionInput,
  AssessmentSubmissionResult,
  AssessmentType,
  AssessmentItemAttempt,
  AssessmentGainAnalytics,
  AssessmentItemStats,
  AssessmentSubmissionAdminRow,
  AssessmentSubmissionListQuery,
  DashboardStudent,
  StudentHistoryRow,
  StudentInvite,
  InviteAcceptInput,
  StudentInviteInput,
  CorpusChunkPreview,
  CorpusDatasetSummary,
  CorpusUploadResponse,
  GeminiHealth,
  SurveyQuestion,
  SurveySubmissionInput,
  SurveySubmissionResult,
  TelemetryEvent,
  TelemetryEventListQuery,
  TelemetryEventRecord,
  TelemetrySummary,
  UserProfile,
  UserRole,
  AssessmentUploadInput,
  ArtifactListQuery,
  ArtifactIssueReportListQuery,
  OperationalAlertsSummary,
  PaginatedResult,
  StudentHistoryListQuery,
  StudentProgressSummary,
  StudentProgressClearResult,
  StudentProtocolControl,
  StudentProtocolAuditListQuery,
  StudentProtocolOverrideAuditEntry,
  StudentProtocolOverrideInput,
  StudentInviteListQuery,
  StudentListQuery,
  UpdateSelfInput,
  UpdateStudentInput,
} from "@/types/models";

export interface ApiAdapter {
  login(email: string, password: string, role: UserRole): Promise<ApiResult<UserProfile>>;
  getCurrentUser(): Promise<ApiResult<UserProfile | null>>;
  refreshToken(): Promise<ApiResult<{ ok: boolean }>>;
  logout(): Promise<ApiResult<{ ok: true }>>;
  updateSelf(input: UpdateSelfInput): Promise<ApiResult<UserProfile>>;
  getInviteForAcceptance(inviteId: string, email: string): Promise<ApiResult<StudentInvite>>;
  acceptInvite(inviteId: string, input: InviteAcceptInput): Promise<ApiResult<UserProfile>>;

  getStudentDashboard(userId: string): Promise<ApiResult<DashboardStudent>>;
  getStudentHistory(userId: string): Promise<ApiResult<StudentHistoryRow[]>>;
  getStudentHistoryPage(userId: string, query: StudentHistoryListQuery): Promise<ApiResult<PaginatedResult<StudentHistoryRow>>>;
  getArtifactById(artifactId: string): Promise<ApiResult<Artifact>>;
  getArtifactsPage(query: ArtifactListQuery): Promise<ApiResult<PaginatedResult<Artifact>>>;
  completeArtifact(artifactId: string, input: ArtifactCompletionInput): Promise<ApiResult<StudentHistoryRow>>;
  getMyArtifactReports(artifactId: string): Promise<ApiResult<ArtifactIssueReport[]>>;

  getAssessment(type: AssessmentType): Promise<ApiResult<AssessmentDefinition>>;
  startAssessmentAttempt(type: AssessmentType): Promise<ApiResult<AssessmentAttemptSession>>;
  getActiveAssessmentAttempt(type: AssessmentType): Promise<ApiResult<AssessmentAttemptSession | null>>;
  getAssessmentDraft(type: AssessmentType, attemptId: string): Promise<ApiResult<AssessmentDraft | null>>;
  saveAssessmentDraft(type: AssessmentType, attemptId: string, items: AssessmentItemAttempt[]): Promise<ApiResult<AssessmentDraft>>;
  clearAssessmentDraft(type: AssessmentType, attemptId: string): Promise<ApiResult<{ ok: true }>>;
  submitAssessment(input: AssessmentSubmissionInput): Promise<ApiResult<AssessmentSubmissionResult>>;
  getAssessmentSubmissionsPage(query: AssessmentSubmissionListQuery): Promise<ApiResult<PaginatedResult<AssessmentSubmissionAdminRow>>>;
  exportAssessmentSubmissionsCsv(query: {
    assessmentType?: AssessmentType | "all";
    group?: "adaptive" | "static" | "all";
    userId?: string;
  }): Promise<ApiResult<string>>;
  exportAdminReportBundle(query: {
    assessmentType?: AssessmentType | "all";
    group?: "adaptive" | "static" | "all";
    userId?: string;
    search?: string;
    event?: string | "all";
    role?: UserRole | "all";
    artifactType?: "parsons" | "tracing" | "mutation" | "flashcard" | "all";
    concept?: string;
    fromTs?: string;
    toTs?: string;
    flagStatus?: "open" | "reviewed" | "resolved" | "all";
    flagReason?: "incorrect_feedback" | "broken_logic" | "unclear_instruction" | "other" | "all";
    flagArtifactId?: string;
  }): Promise<ApiResult<Blob>>;
  getAssessmentItemStats(
    type: AssessmentType,
    group?: "adaptive" | "static" | "all",
  ): Promise<ApiResult<AssessmentItemStats>>;
  getAssessmentGains(): Promise<ApiResult<AssessmentGainAnalytics>>;

  getPretest(): Promise<ApiResult<AssessmentDefinition>>;
  getPosttest(): Promise<ApiResult<AssessmentDefinition>>;
  getSurvey(): Promise<ApiResult<SurveyQuestion[]>>;
  submitSurvey(input: SurveySubmissionInput): Promise<ApiResult<SurveySubmissionResult>>;

  getAdminOverview(): Promise<ApiResult<AdminOverview>>;
  getOperationalAlertsSummary(query?: { windowHours?: number; limit?: number }): Promise<ApiResult<OperationalAlertsSummary>>;
  getStudentsPage(query: StudentListQuery): Promise<ApiResult<PaginatedResult<UserProfile>>>;
  getStudentInvitesPage(query: StudentInviteListQuery): Promise<ApiResult<PaginatedResult<StudentInvite>>>;
  getArtifactIssueReportsPage(query: ArtifactIssueReportListQuery): Promise<ApiResult<PaginatedResult<ArtifactIssueReport>>>;
  getTelemetryEventsPage(query: TelemetryEventListQuery): Promise<ApiResult<PaginatedResult<TelemetryEventRecord>>>;
  getTelemetrySummary(query: Omit<TelemetryEventListQuery, "page" | "pageSize">): Promise<ApiResult<TelemetrySummary>>;
  getStudentProtocolControl(userId: string): Promise<ApiResult<StudentProtocolControl>>;
  getStudentProtocolAuditPage(
    userId: string,
    query: StudentProtocolAuditListQuery,
  ): Promise<ApiResult<PaginatedResult<StudentProtocolOverrideAuditEntry>>>;
  getStudents(): Promise<ApiResult<UserProfile[]>>;
  getStudentInvites(): Promise<ApiResult<StudentInvite[]>>;
  getArtifactIssueReports(): Promise<ApiResult<ArtifactIssueReport[]>>;

  uploadAssessment(input: AssessmentUploadInput): Promise<ApiResult<AssessmentDefinition>>;
  sendTelemetry(event: TelemetryEvent): Promise<ApiResult<{ ok: true }>>;
  inviteStudent(input: StudentInviteInput): Promise<ApiResult<StudentInvite>>;
  resendInvite(inviteId: string): Promise<ApiResult<StudentInvite>>;
  revokeInvite(inviteId: string): Promise<ApiResult<void>>;
  updateStudent(userId: string, input: UpdateStudentInput): Promise<ApiResult<UserProfile>>;
  deleteStudent(userId: string): Promise<ApiResult<void>>;
  updateStudentProtocolControl(userId: string, input: StudentProtocolOverrideInput): Promise<ApiResult<StudentProtocolControl>>;
  reportArtifactIssue(input: ArtifactIssueInput): Promise<ApiResult<ArtifactIssueReport>>;
  updateArtifactIssueStatus(
    reportId: string,
    input: ArtifactIssueStatusUpdateInput,
  ): Promise<ApiResult<ArtifactIssueReport>>;
  uploadCorpus(input: {
    name: string;
    description?: string;
    chunkingMethod?: "castplus" | "cast" | "fixed";
    autoChunk?: boolean;
    maxChunkSize?: number;
    files: File[];
  }): Promise<ApiResult<CorpusUploadResponse>>;
  getCorpusDatasetsPage(query: {
    page: number;
    pageSize: number;
    search?: string;
    status?: "uploaded" | "chunked" | "failed" | "all";
  }): Promise<ApiResult<PaginatedResult<CorpusDatasetSummary>>>;
  chunkCorpusDataset(input: {
    datasetId: string;
    chunkingMethod?: "castplus" | "cast" | "fixed";
    maxChunkSize?: number;
  }): Promise<ApiResult<CorpusDatasetSummary>>;
  getCorpusDatasetChunksPage(input: {
    datasetId: string;
    page: number;
    pageSize: number;
  }): Promise<ApiResult<PaginatedResult<CorpusChunkPreview>>>;
  enqueueCorpusChunkJobAsync(input: {
    datasetId: string;
    chunkingMethod?: "castplus" | "cast" | "fixed";
    maxChunkSize?: number;
    maxAttempts?: number;
  }): Promise<ApiResult<AsyncJobSummary>>;
  checkArtifactAnswer(artifactId: string, input: ArtifactCheckInput): Promise<ApiResult<ArtifactCheckResult>>;
  deleteArtifact(artifactId: string): Promise<ApiResult<null>>;
  cancelAsyncJob(jobId: string): Promise<ApiResult<AsyncJobSummary>>;
  cancelAllAsyncJobs(): Promise<ApiResult<{ cancelled: number }>>;
  checkGeminiHealth(): Promise<ApiResult<GeminiHealth>>;
  setGeminiModel(model: string): Promise<ApiResult<{ activeModel: string }>>;
  deleteCorpusDataset(datasetId: string): Promise<ApiResult<null>>;
  enqueueEmbedCorpusJobAsync(input: {
    datasetId: string;
    maxAttempts?: number;
  }): Promise<ApiResult<AsyncJobSummary>>;
  generateArtifacts(input: ArtifactGenerationRequest): Promise<ApiResult<ArtifactGenerationResult[]>>;
  enqueueGenerateArtifactsJobAsync(
    input: ArtifactGenerationRequest & { maxAttempts?: number },
  ): Promise<ApiResult<AsyncJobSummary>>;
  enqueueGenerateArtifactsBatchJobAsync(input: {
    corpusDatasetId: string;
    concepts: string[];
    artifactTypes: ArtifactType[];
    difficulties: Difficulty[];
    countPerCombo: number;
    temperature?: number;
    maxContextChars?: number;
    maxAttempts?: number;
  }): Promise<ApiResult<AsyncJobSummary>>;
  getAsyncJobsPage(query: {
    page: number;
    pageSize: number;
    jobType?: "corpus_chunk" | "artifact_generate" | "artifact_generate_batch" | "embed_corpus" | "all";
    status?: "queued" | "running" | "succeeded" | "failed" | "all";
  }): Promise<ApiResult<PaginatedResult<AsyncJobSummary>>>;
  getAsyncJobById(jobId: string): Promise<ApiResult<AsyncJobSummary>>;
  processPendingAsyncJobs(limit?: number): Promise<ApiResult<AsyncJobDispatchSummary>>;
  getArtifactCoverage(): Promise<ApiResult<ArtifactCoverageCell[]>>;
  batchDeleteArtifacts(ids: string[]): Promise<ApiResult<{ deleted: number }>>;
  getStudentProgress(userId: string): Promise<ApiResult<StudentProgressSummary>>;
  clearStudentAssessment(userId: string, assessmentType: "pretest" | "posttest"): Promise<ApiResult<StudentProgressClearResult>>;
  clearStudentBkt(userId: string): Promise<ApiResult<StudentProgressClearResult>>;
  clearStudentActivity(userId: string): Promise<ApiResult<StudentProgressClearResult>>;
  clearStudentAllProgress(userId: string): Promise<ApiResult<StudentProgressClearResult>>;
}
