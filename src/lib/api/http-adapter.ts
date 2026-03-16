import axios from "axios";
import type { ApiAdapter } from "./contracts";
import type {
  ArtifactIssueReport,
  ArtifactListQuery,
  ArtifactCompletionInput,
  ArtifactGenerationRequest,
  ArtifactIssueInput,
  ArtifactIssueReportListQuery,
  AssessmentAttemptSession,
  AssessmentDraft,
  AssessmentItemAttempt,
  AssessmentSubmissionListQuery,
  AssessmentSubmissionInput,
  AssessmentType,
  AssessmentUploadInput,
  PaginatedResult,
  StudentHistoryListQuery,
  StudentProtocolControl,
  StudentProtocolAuditListQuery,
  StudentProtocolOverrideAuditEntry,
  StudentProtocolOverrideInput,
  StudentInviteListQuery,
  StudentListQuery,
  TelemetryEventListQuery,
  TelemetrySummary,
  StudentInviteInput,
  TelemetryEvent,
  UpdateSelfInput,
  UserProfile,
  UserRole,
} from "@/types/models";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api",
  timeout: 20000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Refresh token interceptor — on 401, silently call /auth/refresh and retry once.
// Uses a shared promise so concurrent 401s don't trigger multiple refresh calls.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .then(() => true)
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    // Only retry once, and never retry the refresh or login endpoints.
    if (
      error.response?.status === 401 &&
      !config._retried &&
      !config.url?.includes("/auth/refresh") &&
      !config.url?.includes("/auth/login")
    ) {
      config._retried = true;
      const ok = await tryRefresh();
      if (ok) return api(config);
      // Refresh failed — silently clear session; let the Next.js middleware
      // or the login-page useEffect handle the redirect naturally.
      if (typeof window !== "undefined") {
        const { useSessionStore } = await import("@/lib/auth/session-store");
        useSessionStore.getState().clear();
      }
    }
    return Promise.reject(error);
  },
);

export const httpAdapter: ApiAdapter = {
  async login(email: string, password: string, role: UserRole) {
    const res = await api.post("/auth/login", { email, password, role });
    return { data: res.data, source: "live" };
  },

  async getCurrentUser() {
    const res = await api.get("/auth/me");
    return { data: res.data, source: "live" };
  },

  async refreshToken() {
    const res = await api.post("/auth/refresh");
    return { data: res.data, source: "live" as const };
  },

  async logout() {
    const res = await api.post("/auth/logout");
    return { data: res.data, source: "live" };
  },

  async updateSelf(input: UpdateSelfInput) {
    const res = await api.patch("/auth/me", input);
    return { data: res.data, source: "live" };
  },

  async getInviteForAcceptance(inviteId: string, email: string) {
    const res = await api.get(`/auth/invites/${inviteId}`, { params: { email } });
    return { data: res.data, source: "live" };
  },

  async acceptInvite(inviteId: string, input) {
    const res = await api.post(`/auth/invites/${inviteId}/accept`, input);
    return { data: res.data, source: "live" };
  },

  async getStudentDashboard(userId: string) {
    const res = await api.get(`/student/dashboard`, { params: { userId } });
    return { data: res.data, source: "live" };
  },

  async getStudentHistory(userId: string) {
    const res = await api.get(`/student/history`, { params: { userId } });
    return { data: res.data, source: "live" };
  },

  async getStudentHistoryPage(userId: string, query: StudentHistoryListQuery) {
    const res = await api.get(`/student/history`, { params: { userId, ...query } });
    return { data: res.data, source: "live" };
  },

  async getArtifactById(artifactId: string) {
    const res = await api.get(`/artifacts/${artifactId}`);
    return { data: res.data, source: "live" };
  },

  async getArtifactsPage(query: ArtifactListQuery) {
    const res = await api.get("/admin/artifacts", { params: query });
    return { data: res.data, source: "live" };
  },

  async completeArtifact(artifactId: string, input: ArtifactCompletionInput) {
    const res = await api.post(`/artifacts/${artifactId}/submit`, input);
    return { data: res.data, source: "live" as const };
  },

  async getMyArtifactReports(artifactId: string) {
    const res = await api.get(`/artifacts/${artifactId}/my-reports`);
    return { data: res.data as ArtifactIssueReport[], source: "live" as const };
  },

  async getAssessment(type: AssessmentType) {
    const res = await api.get(`/assessments/${type}`);
    return { data: res.data, source: "live" };
  },

  async startAssessmentAttempt(type: AssessmentType) {
    const res = await api.post(`/assessments/${type}/attempts`);
    return { data: res.data as AssessmentAttemptSession, source: "live" };
  },

  async getActiveAssessmentAttempt(type: AssessmentType) {
    const res = await api.get(`/assessments/${type}/attempts/active`);
    return { data: (res.data ?? null) as AssessmentAttemptSession | null, source: "live" };
  },

  async getAssessmentDraft(type: AssessmentType, attemptId: string) {
    const res = await api.get(`/assessments/${type}/attempts/${attemptId}/draft`);
    return { data: (res.data ?? null) as AssessmentDraft | null, source: "live" };
  },

  async saveAssessmentDraft(type: AssessmentType, attemptId: string, items: AssessmentItemAttempt[]) {
    const res = await api.put(`/assessments/${type}/attempts/${attemptId}/draft`, { items });
    return { data: res.data as AssessmentDraft, source: "live" };
  },

  async clearAssessmentDraft(type: AssessmentType, attemptId: string) {
    const res = await api.delete(`/assessments/${type}/attempts/${attemptId}/draft`);
    return { data: res.data as { ok: true }, source: "live" };
  },

  async submitAssessment(input: AssessmentSubmissionInput) {
    const res = await api.post(`/assessments/${input.assessmentType}/submissions`, input);
    return { data: res.data, source: "live" };
  },

  async getAssessmentSubmissionsPage(query: AssessmentSubmissionListQuery) {
    const res = await api.get("/admin/assessment-submissions", { params: query });
    return { data: res.data, source: "live" };
  },

  async exportAssessmentSubmissionsCsv(query) {
    const res = await api.get("/admin/assessment-submissions/export", {
      params: query,
      responseType: "text",
    });
    return { data: res.data as string, source: "live" };
  },

  async exportResearchSummary() {
    const res = await api.get("/admin/research/export-summary", { responseType: "text" });
    return { data: res.data as string, source: "live" as const };
  },

  async exportAdminReportBundle(query) {
    const res = await api.get("/admin/reports/export-bundle", {
      params: query,
      responseType: "blob",
    });
    return { data: res.data as Blob, source: "live" };
  },

  async getAssessmentItemStats(type: AssessmentType, group: "adaptive" | "static" | "all" = "all") {
    const res = await api.get("/admin/assessment-item-stats", {
      params: { assessmentType: type, group },
    });
    return { data: res.data, source: "live" };
  },

  async getAssessmentGains() {
    const res = await api.get("/admin/assessment-gains");
    return { data: res.data, source: "live" };
  },

  async getPretest() {
    return this.getAssessment("pretest");
  },

  async getPosttest() {
    return this.getAssessment("posttest");
  },

  async getSurvey() {
    const res = await api.get("/surveys/usability");
    return { data: res.data, source: "live" };
  },

  async submitSurvey(input) {
    const res = await api.post("/surveys/usability", input);
    return { data: res.data, source: "live" };
  },

  async adminGetSurveyQuestions() {
    const res = await api.get("/surveys/admin/questions");
    return { data: res.data, source: "live" };
  },

  async adminUpsertSurveyQuestions(questions) {
    const res = await api.put("/surveys/admin/questions", { questions });
    return { data: res.data, source: "live" };
  },

  async adminGetSurveyResponses() {
    const res = await api.get("/surveys/admin/responses");
    return { data: res.data, source: "live" };
  },

  async adminExportSurveyResponsesCsv() {
    const res = await api.get("/surveys/admin/responses/export", { responseType: "text" });
    return { data: res.data as string, source: "live" };
  },

  async getAdminOverview() {
    const res = await api.get("/admin/overview");
    return { data: res.data, source: "live" };
  },

  async getOperationalAlertsSummary(query = {}) {
    const res = await api.get("/admin/ops/alerts", { params: query });
    return { data: res.data, source: "live" };
  },

  async getStudentsPage(query: StudentListQuery) {
    const res = await api.get("/admin/students", { params: query });
    return { data: res.data, source: "live" };
  },

  async getStudentInvitesPage(query: StudentInviteListQuery) {
    const res = await api.get("/admin/student-invites", { params: query });
    return { data: res.data, source: "live" };
  },

  async getArtifactIssueReportsPage(query: ArtifactIssueReportListQuery) {
    const res = await api.get("/admin/artifact-issue-reports", { params: query });
    return { data: res.data, source: "live" };
  },

  async getTelemetryEventsPage(query: TelemetryEventListQuery) {
    const res = await api.get("/admin/events", { params: query });
    return { data: res.data, source: "live" };
  },

  async getTelemetrySummary(query: Omit<TelemetryEventListQuery, "page" | "pageSize">) {
    const res = await api.get("/admin/events/summary", { params: query });
    return { data: res.data as TelemetrySummary, source: "live" };
  },

  async getStudentProtocolControl(userId: string) {
    const res = await api.get(`/admin/students/${userId}/protocol`);
    return { data: res.data as StudentProtocolControl, source: "live" };
  },

  async getStudentProtocolAuditPage(userId: string, query: StudentProtocolAuditListQuery) {
    const res = await api.get(`/admin/students/${userId}/protocol/audit`, { params: query });
    return {
      data: res.data as PaginatedResult<StudentProtocolOverrideAuditEntry>,
      source: "live",
    };
  },

  async getStudents() {
    const res = await api.get("/admin/students");
    return { data: res.data, source: "live" };
  },

  async getStudentInvites() {
    const res = await api.get("/admin/student-invites");
    return { data: res.data, source: "live" };
  },

  async getArtifactIssueReports() {
    const res = await api.get("/admin/artifact-issue-reports");
    return { data: res.data, source: "live" };
  },

  async uploadAssessment(input: AssessmentUploadInput) {
    const res = await api.post(`/admin/assessments/${input.assessmentType}`, input);
    return { data: res.data, source: "live" };
  },

  async sendTelemetry(event: TelemetryEvent) {
    const res = await api.post("/events", event);
    return { data: res.data, source: "live" };
  },

  async inviteStudent(input: StudentInviteInput) {
    const res = await api.post("/admin/student-invites", input);
    return { data: res.data, source: "live" };
  },

  async resendInvite(inviteId: string) {
    const res = await api.post(`/admin/student-invites/${inviteId}/resend`);
    return { data: res.data, source: "live" as const };
  },

  async revokeInvite(inviteId: string) {
    await api.delete(`/admin/student-invites/${inviteId}`);
    return { data: undefined, source: "live" as const };
  },

  async updateStudent(userId: string, input) {
    const res = await api.patch(`/admin/students/${userId}`, input);
    return { data: res.data as UserProfile, source: "live" as const };
  },

  async deleteStudent(userId: string) {
    await api.delete(`/admin/students/${userId}`);
    return { data: undefined, source: "live" as const };
  },

  async updateStudentProtocolControl(userId: string, input: StudentProtocolOverrideInput) {
    const res = await api.put(`/admin/students/${userId}/protocol`, input);
    return { data: res.data as StudentProtocolControl, source: "live" };
  },

  async reportArtifactIssue(input: ArtifactIssueInput) {
    const res = await api.post("/artifacts/report-issue", input);
    return { data: res.data, source: "live" };
  },

  async updateArtifactIssueStatus(reportId, input) {
    const res = await api.patch(`/admin/artifact-issue-reports/${reportId}/status`, input);
    return { data: res.data, source: "live" };
  },

  async uploadCorpus(input) {
    const form = new FormData();
    form.append("name", input.name);
    if (input.description) form.append("description", input.description);
    if (input.chunkingMethod) form.append("chunkingMethod", input.chunkingMethod);
    if (typeof input.autoChunk === "boolean") form.append("autoChunk", String(input.autoChunk));
    if (typeof input.maxChunkSize === "number") form.append("maxChunkSize", String(input.maxChunkSize));
    for (const file of input.files) form.append("files", file);
    const res = await api.post("/admin/corpus/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: res.data, source: "live" };
  },

  async getCorpusDatasetsPage(query) {
    const res = await api.get("/admin/corpus/datasets", { params: query });
    return { data: res.data, source: "live" };
  },

  async chunkCorpusDataset(input) {
    const res = await api.post(`/admin/corpus/datasets/${input.datasetId}/chunk`, null, {
      params: {
        chunkingMethod: input.chunkingMethod,
        maxChunkSize: input.maxChunkSize,
      },
    });
    return { data: res.data, source: "live" };
  },

  async getCorpusDatasetChunksPage(input) {
    const res = await api.get(`/admin/corpus/datasets/${input.datasetId}/chunks`, {
      params: { page: input.page, pageSize: input.pageSize },
    });
    return { data: res.data, source: "live" };
  },

  async enqueueCorpusChunkJobAsync(input) {
    const res = await api.post(`/admin/corpus/datasets/${input.datasetId}/chunk-async`, null, {
      params: {
        chunkingMethod: input.chunkingMethod,
        maxChunkSize: input.maxChunkSize,
        maxAttempts: input.maxAttempts,
      },
    });
    return { data: res.data, source: "live" };
  },

  async checkArtifactAnswer(artifactId: string, input: import("@/types/models").ArtifactCheckInput) {
    const res = await api.post(`/artifacts/${artifactId}/check-answer`, input);
    return { data: res.data, source: "live" as const };
  },

  async deleteArtifact(artifactId: string) {
    await api.delete(`/admin/artifacts/${artifactId}`);
    return { data: null, source: "live" as const };
  },

  async cancelAsyncJob(jobId: string) {
    const res = await api.post(`/admin/jobs/${jobId}/cancel`);
    return { data: res.data, source: "live" as const };
  },

  async cancelAllAsyncJobs() {
    const res = await api.post("/admin/jobs/cancel-all");
    return { data: res.data, source: "live" as const };
  },

  async checkGeminiHealth() {
    const res = await api.get("/admin/settings/gemini-health");
    return { data: res.data, source: "live" as const };
  },

  async setGeminiModel(model: string) {
    const res = await api.put("/admin/settings/gemini-model", { model });
    return { data: res.data, source: "live" as const };
  },

  async deleteCorpusDataset(datasetId: string) {
    await api.delete(`/admin/corpus/datasets/${datasetId}`);
    return { data: null, source: "live" as const };
  },

  async enqueueEmbedCorpusJobAsync(input: { datasetId: string; maxAttempts?: number }) {
    const res = await api.post(`/admin/corpus/datasets/${input.datasetId}/embed-async`, null, {
      params: { maxAttempts: input.maxAttempts },
    });
    return { data: res.data, source: "live" };
  },

  async generateArtifacts(input: ArtifactGenerationRequest) {
    const res = await api.post("/admin/artifacts/generate", input);
    return { data: res.data, source: "live" };
  },

  async enqueueGenerateArtifactsJobAsync(input) {
    const { maxAttempts, ...payload } = input;
    const res = await api.post("/admin/artifacts/generate-async", payload, {
      params: { maxAttempts },
    });
    return { data: res.data, source: "live" };
  },

  async enqueueGenerateArtifactsBatchJobAsync(input) {
    const { maxAttempts, ...payload } = input;
    const res = await api.post("/admin/artifacts/generate-batch-async", payload, {
      params: { maxAttempts },
    });
    return { data: res.data, source: "live" };
  },

  async getAsyncJobsPage(query) {
    const res = await api.get("/admin/jobs", { params: query });
    return { data: res.data, source: "live" };
  },

  async getAsyncJobById(jobId: string) {
    const res = await api.get(`/admin/jobs/${jobId}`);
    return { data: res.data, source: "live" };
  },

  async processPendingAsyncJobs(limit = 10) {
    const res = await api.post("/admin/jobs/process-pending", null, { params: { limit } });
    return { data: res.data, source: "live" };
  },

  async getArtifactCoverage() {
    const res = await api.get("/admin/artifacts/coverage");
    return { data: res.data, source: "live" as const };
  },

  async batchDeleteArtifacts(ids: string[]) {
    const res = await api.delete("/admin/artifacts/batch", { data: { ids } });
    return { data: res.data, source: "live" as const };
  },

  async getStudentProgress(userId: string) {
    const res = await api.get(`/admin/students/${userId}/progress`);
    return { data: res.data, source: "live" as const };
  },
  async clearStudentAssessment(userId: string, assessmentType: "pretest" | "posttest") {
    const res = await api.delete(`/admin/students/${userId}/progress/assessment/${assessmentType}`);
    return { data: res.data, source: "live" as const };
  },
  async clearStudentBkt(userId: string) {
    const res = await api.delete(`/admin/students/${userId}/progress/bkt`);
    return { data: res.data, source: "live" as const };
  },
  async clearStudentActivity(userId: string) {
    const res = await api.delete(`/admin/students/${userId}/progress/activity`);
    return { data: res.data, source: "live" as const };
  },
  async clearStudentAllProgress(userId: string) {
    const res = await api.delete(`/admin/students/${userId}/progress`);
    return { data: res.data, source: "live" as const };
  },
};
