import { z } from "zod";

export const apiErrorSchema = z.object({
  code: z.string(), message: z.string(), fieldErrors: z.record(z.string(), z.string()),
  recoveryAction: z.string(), traceId: z.string()
});
export const laborWarningSchema = z.object({
  level: z.enum(["NORMAL", "APPROACHING", "ACTION"]), percent: z.number().int().nonnegative(), reason: z.string()
});
export const schedulingJobSchema = z.object({
  jobId: z.string().uuid(), status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "INFEASIBLE", "FAILED"]),
  periodStart: z.string(), periodEnd: z.string(), unmetDemand: z.number().int().nonnegative(),
  scorePercent: z.number().int().nullable(), failureReason: z.string().nullable(), createdAt: z.string(), version: z.number().int()
});
export type ApiError = z.infer<typeof apiErrorSchema>;
export type LaborWarning = z.infer<typeof laborWarningSchema>;
export type SchedulingJob = z.infer<typeof schedulingJobSchema>;

