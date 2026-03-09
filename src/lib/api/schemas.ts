import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["student", "admin"]),
  group: z.enum(["adaptive", "static"]).optional(),
});

export const apiResultSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    data: payloadSchema,
    source: z.literal("live"),
  });
