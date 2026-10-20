import { z } from "zod";

export const eventNoticeSchema = z.object({
  title: z.string().trim().min(3).max(100),
  message: z.string().trim().min(8).max(500),
  actionLabel: z.string().trim().min(2).max(40),
  eventPath: z.string().trim().max(180).regex(/^\/events(?:\/[a-z0-9-]+)?(?:\?[a-zA-Z0-9_=&%-]*)?$/, "Use an internal CSC event page path."),
  bannerPath: z.string().regex(/^event-banners\/[0-9a-f-]{36}\.webp$/i).optional().default(""),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type EventNotice = z.infer<typeof eventNoticeSchema>;
