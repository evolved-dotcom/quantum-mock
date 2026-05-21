import { z } from 'zod';

export const ResponseDefSchema = z.object({
  status: z.number().int().min(100).max(599),
  responseType: z.enum(['application/json', 'text/plain', 'text/html', 'application/xml']).default('application/json'),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string(),
  delayMs: z.number().int().min(0).default(0),
  simulateNetworkError: z.boolean().default(false)
});

export const CapturedTrafficSchema = z.object({
  requestHeaders: z.record(z.string(), z.string()).default({}),
  responseHeaders: z.record(z.string(), z.string()).default({}),
  cookies: z.record(z.string(), z.string()).default({}),
  requestBody: z.string().optional()
});

export const MockRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  active: z.boolean(),
  urlPattern: z.string(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "ANY"]),
  scenarioId: z.string().nullable(),
  priority: z.number().default(0),
  activeResponseIndex: z.number().default(0),
  interceptCount: z.number().default(0).optional(),
  responses: z.array(ResponseDefSchema).min(1),
  capturedTraffic: CapturedTrafficSchema.optional()
});

export type ResponseDef = z.infer<typeof ResponseDefSchema>;
export type CapturedTraffic = z.infer<typeof CapturedTrafficSchema>;
export type MockRule = z.infer<typeof MockRuleSchema>;
