/**
 * Notification Routes
 *
 * API endpoints for webhook notifications.
 * All webhooks go through the unified sendAlertNotification path.
 */
import { Hono } from 'hono';
import type { Env } from '../types.js';
export declare const notificationRoutes: Hono<Env, {}, "/">;
//# sourceMappingURL=routes.d.ts.map