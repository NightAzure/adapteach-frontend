"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  ArtifactListQuery,
  ArtifactCompletionInput,
  ArtifactGenerationRequest,
  ArtifactIssueInput,
  ArtifactIssueStatusUpdateInput,
  ArtifactIssueReportListQuery,
  AssessmentItemAttempt,
  AssessmentSubmissionListQuery,
  AssessmentSubmissionInput,
  AssessmentType,
  AssessmentUploadInput,
  StudentHistoryListQuery,
  StudentProtocolAuditListQuery,
  StudentProtocolOverrideInput,
  StudentInviteListQuery,
  StudentListQuery,
  TelemetryEventListQuery,
  StudentInviteInput,
  TelemetryEvent,
  UpdateSelfInput,
  UpdateStudentInput,
} from "@/types/models";

export function useStudentDashboard(userId: string) {
  return useQuery({
    queryKey: queryKeys.studentDashboard(userId),
    queryFn: () => apiClient.getStudentDashboard(userId).then((res) => res.data),
    enabled: Boolean(userId),
  });
}

export function useStudentHistory(userId: string) {
  return useQuery({
    queryKey: queryKeys.studentHistory(userId),
    queryFn: () => apiClient.getStudentHistory(userId).then((res) => res.data),
    enabled: Boolean(userId),
  });
}

export function useStudentHistoryPage(userId: string, query: StudentHistoryListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentHistoryPage(userId, query),
    queryFn: () => apiClient.getStudentHistoryPage(userId, query).then((res) => res.data),
    enabled: Boolean(userId) && enabled,
  });
}

export function useArtifact(id: string) {
  return useQuery({
    queryKey: queryKeys.artifact(id),
    queryFn: () => apiClient.getArtifactById(id).then((res) => res.data),
    enabled: Boolean(id),
  });
}

export function useArtifactsPage(query: ArtifactListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.artifactsPage(query),
    queryFn: () => apiClient.getArtifactsPage(query).then((res) => res.data),
    enabled,
  });
}

export function useMyArtifactReports(artifactId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myArtifactReports(artifactId),
    queryFn: () => apiClient.getMyArtifactReports(artifactId).then((res) => res.data),
    enabled: Boolean(artifactId) && enabled,
  });
}

export function useAssessment(type: AssessmentType, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessment(type),
    queryFn: () => apiClient.getAssessment(type).then((res) => res.data),
    enabled,
  });
}

export function useAssessmentSubmissionsPage(query: AssessmentSubmissionListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessmentSubmissionsPage(query),
    queryFn: () => apiClient.getAssessmentSubmissionsPage(query).then((res) => res.data),
    enabled,
  });
}

export function useAssessmentItemStats(
  type: AssessmentType,
  group: "adaptive" | "static" | "all" = "all",
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.assessmentItemStats(type, group),
    queryFn: () => apiClient.getAssessmentItemStats(type, group).then((res) => res.data),
    enabled,
  });
}

export function useAssessmentGains(enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessmentGains,
    queryFn: () => apiClient.getAssessmentGains().then((res) => res.data),
    enabled,
  });
}

export function useActiveAssessmentAttempt(type: AssessmentType, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessmentAttemptActive(type),
    queryFn: () => apiClient.getActiveAssessmentAttempt(type).then((res) => res.data),
    enabled,
    // Only poll while the attempt is open (or no data yet on initial load).
    // Stop polling once the attempt transitions to "completed" or "expired" to
    // avoid unnecessary backend traffic after the test is done.
    refetchInterval: (query) =>
      !query.state.data || query.state.data.status === "open" ? 10000 : false,
  });
}

export function useAssessmentDraft(type: AssessmentType, attemptId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.assessmentDraft(type, attemptId),
    queryFn: () => apiClient.getAssessmentDraft(type, attemptId).then((res) => res.data),
    enabled: Boolean(attemptId) && enabled,
    staleTime: 0,
  });
}

export function usePretest() {
  return useAssessment("pretest");
}

export function usePosttest() {
  return useAssessment("posttest");
}

export function useSurvey() {
  return useQuery({
    queryKey: queryKeys.survey,
    queryFn: () => apiClient.getSurvey().then((res) => res.data),
  });
}

export function useAdminSurveyQuestions() {
  return useQuery({
    queryKey: queryKeys.adminSurveyQuestions,
    queryFn: () => apiClient.adminGetSurveyQuestions().then((res) => res.data),
  });
}

export function useAdminSurveyResponses() {
  return useQuery({
    queryKey: queryKeys.adminSurveyResponses,
    queryFn: () => apiClient.adminGetSurveyResponses().then((res) => res.data),
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: () => apiClient.getAdminOverview().then((res) => res.data),
  });
}

export function useOperationalAlertsSummary(windowHours = 24, limit = 12, enabled = true) {
  return useQuery({
    queryKey: queryKeys.operationalAlertsSummary(windowHours, limit),
    queryFn: () => apiClient.getOperationalAlertsSummary({ windowHours, limit }).then((res) => res.data),
    enabled,
    refetchInterval: 30000,
  });
}

export function useStudents() {
  return useQuery({
    queryKey: queryKeys.students,
    queryFn: () => apiClient.getStudents().then((res) => res.data),
  });
}

export function useStudentsPage(query: StudentListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentsPage(query),
    queryFn: () => apiClient.getStudentsPage(query).then((res) => res.data),
    enabled,
  });
}

export function useStudentInvites() {
  return useQuery({
    queryKey: queryKeys.studentInvites,
    queryFn: () => apiClient.getStudentInvites().then((res) => res.data),
  });
}

export function useStudentInvitesPage(query: StudentInviteListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentInvitesPage(query),
    queryFn: () => apiClient.getStudentInvitesPage(query).then((res) => res.data),
    enabled,
  });
}

export function useArtifactIssueReports() {
  return useQuery({
    queryKey: queryKeys.artifactIssueReports,
    queryFn: () => apiClient.getArtifactIssueReports().then((res) => res.data),
  });
}

export function useArtifactIssueReportsPage(query: ArtifactIssueReportListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.artifactIssueReportsPage(query),
    queryFn: () => apiClient.getArtifactIssueReportsPage(query).then((res) => res.data),
    enabled,
  });
}

export function useTelemetryEventsPage(query: TelemetryEventListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.telemetryEventsPage(query),
    queryFn: () => apiClient.getTelemetryEventsPage(query).then((res) => res.data),
    enabled,
  });
}

export function useTelemetrySummary(query: Omit<TelemetryEventListQuery, "page" | "pageSize">, enabled = true) {
  return useQuery({
    queryKey: queryKeys.telemetrySummary(query),
    queryFn: () => apiClient.getTelemetrySummary(query).then((res) => res.data),
    enabled,
  });
}

export function useStudentProtocolControl(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentProtocol(userId),
    queryFn: () => apiClient.getStudentProtocolControl(userId).then((res) => res.data),
    enabled: Boolean(userId) && enabled,
  });
}

export function useStudentProtocolAuditPage(userId: string, query: StudentProtocolAuditListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.studentProtocolAuditPage(userId, query),
    queryFn: () => apiClient.getStudentProtocolAuditPage(userId, query).then((res) => res.data),
    enabled: Boolean(userId) && enabled,
  });
}

export function useTelemetryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (event: TelemetryEvent) => apiClient.sendTelemetry(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
    },
  });
}

export function useInviteStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentInviteInput) => apiClient.inviteStudent(input),
    onSuccess: () => {
      // Invalidate both the paginated and unpaginated invite queries
      queryClient.invalidateQueries({ queryKey: ["admin", "student-invites"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });
}

export function useResendInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => apiClient.resendInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "student-invites"] });
    },
  });
}

export function useRevokeInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => apiClient.revokeInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "student-invites"] });
    },
  });
}

export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateStudentInput }) =>
      apiClient.updateStudent(userId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });
}

export function useUpdateSelfMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSelfInput) => apiClient.updateSelf(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useDeleteStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.deleteStudent(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
    },
  });
}

export function useCompleteArtifactMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { artifactId: string } & ArtifactCompletionInput) =>
      apiClient.completeArtifact(input.artifactId, {
        userId: input.userId,
        attempts: input.attempts,
        hintsUsed: input.hintsUsed,
        durationMs: input.durationMs,
        correctness: input.correctness,
      }),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentHistory(input.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard(input.userId) });
    },
  });
}

export function useReportArtifactIssueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArtifactIssueInput) => apiClient.reportArtifactIssue(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artifactIssueReports });
      queryClient.invalidateQueries({ queryKey: queryKeys.myArtifactReports(input.artifactId) });
    },
  });
}

export function useUpdateArtifactIssueStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reportId: string; payload: ArtifactIssueStatusUpdateInput }) =>
      apiClient.updateArtifactIssueStatus(input.reportId, input.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artifactIssueReports });
      queryClient.invalidateQueries({ queryKey: ["admin", "artifact-issue-reports"] });
    },
  });
}

export function useSubmitAssessmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssessmentSubmissionInput) => apiClient.submitAssessment(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard(input.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.assessmentAttemptActive(input.assessmentType) });
    },
  });
}

export function useStartAssessmentAttemptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentType: AssessmentType) => apiClient.startAssessmentAttempt(assessmentType),
    onSuccess: (_result, assessmentType) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessmentAttemptActive(assessmentType) });
    },
  });
}

export function useSaveAssessmentDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { assessmentType: AssessmentType; attemptId: string; items: AssessmentItemAttempt[] }) =>
      apiClient.saveAssessmentDraft(input.assessmentType, input.attemptId, input.items),
    onSuccess: (_result, input) => {
      queryClient.setQueryData(queryKeys.assessmentDraft(input.assessmentType, input.attemptId), _result.data);
    },
  });
}

export function useClearAssessmentDraftMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { assessmentType: AssessmentType; attemptId: string }) =>
      apiClient.clearAssessmentDraft(input.assessmentType, input.attemptId),
    onSuccess: (_result, input) => {
      queryClient.setQueryData(queryKeys.assessmentDraft(input.assessmentType, input.attemptId), null);
    },
  });
}

export function useUploadAssessmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssessmentUploadInput) => apiClient.uploadAssessment(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment(input.assessmentType) });
    },
  });
}

export function useUpdateStudentProtocolControlMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: StudentProtocolOverrideInput }) =>
      apiClient.updateStudentProtocolControl(userId, input),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studentProtocol(vars.userId) });
      queryClient.invalidateQueries({ queryKey: ["admin", "students", vars.userId, "protocol", "audit"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard(vars.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students });
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
    },
  });
}

export function useCorpusDatasetsPage(
  query: { page: number; pageSize: number; search?: string; status?: "uploaded" | "chunked" | "failed" | "all" },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.corpusDatasetsPage(query),
    queryFn: () => apiClient.getCorpusDatasetsPage(query).then((res) => res.data),
    enabled,
  });
}

export function useCorpusDatasetChunksPage(
  input: { datasetId: string; page: number; pageSize: number },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.corpusDatasetChunksPage(input.datasetId, { page: input.page, pageSize: input.pageSize }),
    queryFn: () => apiClient.getCorpusDatasetChunksPage(input).then((res) => res.data),
    enabled: Boolean(input.datasetId) && enabled,
  });
}

export function useUploadCorpusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      chunkingMethod?: "castplus" | "cast" | "fixed";
      autoChunk?: boolean;
      maxChunkSize?: number;
      files: File[];
    }) => apiClient.uploadCorpus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets"] });
    },
  });
}

export function useChunkCorpusDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { datasetId: string; chunkingMethod?: "castplus" | "cast" | "fixed"; maxChunkSize?: number }) =>
      apiClient.chunkCorpusDataset(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets", input.datasetId, "chunks"] });
    },
  });
}

export function useGenerateArtifactsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArtifactGenerationRequest) => apiClient.generateArtifacts(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "artifacts"] });
    },
  });
}

export function useAsyncJobsPage(
  query: {
    page: number;
    pageSize: number;
    jobType?: "corpus_chunk" | "artifact_generate" | "embed_corpus" | "all";
    status?: "queued" | "running" | "succeeded" | "failed" | "all";
  },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.asyncJobsPage(query),
    queryFn: () => apiClient.getAsyncJobsPage(query).then((res) => res.data),
    enabled,
    refetchInterval: 5000,
  });
}

export function useAsyncJob(jobId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.asyncJob(jobId),
    queryFn: () => apiClient.getAsyncJobById(jobId).then((res) => res.data),
    enabled: Boolean(jobId) && enabled,
    refetchInterval: 3000,
  });
}

export function useEnqueueCorpusChunkJobAsyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      datasetId: string;
      chunkingMethod?: "castplus" | "cast" | "fixed";
      maxChunkSize?: number;
      maxAttempts?: number;
    }) => apiClient.enqueueCorpusChunkJobAsync(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets", input.datasetId, "chunks"] });
    },
  });
}

export function useDeleteArtifactMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (artifactId: string) => apiClient.deleteArtifact(artifactId),
    onMutate: (artifactId) => {
      qc.setQueriesData<{ items: { id: string }[]; total: number }>(
        { queryKey: ["admin", "artifacts"] },
        (old) => {
          if (!old?.items) return old;
          return { ...old, items: old.items.filter((a) => a.id !== artifactId), total: Math.max(0, old.total - 1) };
        },
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "artifacts"] });
      qc.invalidateQueries({ queryKey: queryKeys.artifactCoverage });
    },
  });
}

export function useCancelAsyncJobMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiClient.cancelAsyncJob(jobId),
    onMutate: (jobId) => {
      // Instantly mark the job as failed in all cached job pages
      qc.setQueriesData<{ items: { id: string; status: string; error?: string | null }[] }>(
        { queryKey: ["admin", "jobs"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((j) =>
              j.id === jobId ? { ...j, status: "failed", error: "Cancelled by admin" } : j,
            ),
          };
        },
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });
}

export function useCancelAllAsyncJobsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.cancelAllAsyncJobs(),
    onMutate: () => {
      qc.setQueriesData<{ items: { status: string; error?: string | null }[] }>(
        { queryKey: ["admin", "jobs"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((j) =>
              j.status === "queued" || j.status === "running"
                ? { ...j, status: "failed", error: "Cancelled by admin" }
                : j,
            ),
          };
        },
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });
}

export function useCheckGeminiHealthMutation() {
  return useMutation({
    mutationFn: () => apiClient.checkGeminiHealth(),
  });
}

export function useSetGeminiModelMutation() {
  return useMutation({
    mutationFn: (model: string) => apiClient.setGeminiModel(model),
  });
}

export function useDeleteCorpusDatasetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => apiClient.deleteCorpusDataset(datasetId),
    onMutate: (datasetId) => {
      // Instantly remove the dataset from all cached dataset pages
      queryClient.setQueriesData<{ items: { id: string }[]; total: number }>(
        { queryKey: ["admin", "corpus", "datasets"] },
        (old) => {
          if (!old) return old;
          const next = old.items.filter((d) => d.id !== datasetId);
          return { ...old, items: next, total: Math.max(0, old.total - 1) };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets"] });
    },
  });
}

export function useEnqueueEmbedCorpusJobAsyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { datasetId: string; maxAttempts?: number }) =>
      apiClient.enqueueEmbedCorpusJobAsync(input),
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets", input.datasetId] });
    },
  });
}

export function useEnqueueGenerateArtifactsJobAsyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ArtifactGenerationRequest & { maxAttempts?: number }) =>
      apiClient.enqueueGenerateArtifactsJobAsync(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });
}

export function useEnqueueGenerateArtifactsBatchJobAsyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof apiClient.enqueueGenerateArtifactsBatchJobAsync>[0]) =>
      apiClient.enqueueGenerateArtifactsBatchJobAsync(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    },
  });
}

export function useProcessPendingAsyncJobsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limit?: number) => apiClient.processPendingAsyncJobs(limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "corpus", "datasets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "artifacts"] });
    },
  });
}

export function useArtifactCoverage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.artifactCoverage,
    queryFn: () => apiClient.getArtifactCoverage().then((res) => res.data),
    enabled,
  });
}

export function useBatchDeleteArtifactsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiClient.batchDeleteArtifacts(ids),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "artifacts"] });
      qc.invalidateQueries({ queryKey: queryKeys.artifactCoverage });
    },
  });
}

export function useStudentProgress(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["admin", "students", userId, "progress"],
    queryFn: () => apiClient.getStudentProgress(userId),
    select: (res) => res.data,
    enabled: enabled && Boolean(userId),
  });
}

export function useClearStudentAssessmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, assessmentType }: { userId: string; assessmentType: "pretest" | "posttest" }) =>
      apiClient.clearStudentAssessment(userId, assessmentType),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "students", vars.userId, "progress"] });
    },
  });
}

export function useClearStudentBktMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.clearStudentBkt(userId),
    onSettled: (_data, _err, userId) => {
      qc.invalidateQueries({ queryKey: ["admin", "students", userId, "progress"] });
    },
  });
}

export function useClearStudentActivityMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.clearStudentActivity(userId),
    onSettled: (_data, _err, userId) => {
      qc.invalidateQueries({ queryKey: ["admin", "students", userId, "progress"] });
    },
  });
}

export function useClearStudentAllProgressMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.clearStudentAllProgress(userId),
    onSettled: (_data, _err, userId) => {
      qc.invalidateQueries({ queryKey: ["admin", "students", userId, "progress"] });
    },
  });
}
