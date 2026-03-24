/**
 * Notification Routes
 *
 * API endpoints for webhook notifications.
 */

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { buildWebhookPayload, sendAlertWebhook } from './webhook.js';

export const notificationRoutes = new Hono<Env>();

/**
 * POST /api/notify/webhook
 * Send an alert notification via webhook
 *
 * Body: {
 *   webhookUrl: string;
 *   alert: {
 *     id: string;
 *     title: string;
 *     description?: string;
 *     severity: string;
 *     domain: string;
 *     tenantId: string;
 *   };
 *   baseUrl?: string;
 * }
 */
notificationRoutes.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();
    const { webhookUrl, alert, baseUrl } = body;

    // Validate required fields
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return c.json(
        {
          error: 'Bad Request',
          message: 'webhookUrl is required and must be a string',
        },
        400
      );
    }

    if (!alert || typeof alert !== 'object') {
      return c.json(
        {
          error: 'Bad Request',
          message: 'alert is required and must be an object',
        },
        400
      );
    }

    // Validate alert required fields
    const requiredAlertFields = ['id', 'title', 'severity', 'domain', 'tenantId'];
    for (const field of requiredAlertFields) {
      if (!(field in alert)) {
        return c.json(
          {
            error: 'Bad Request',
            message: `alert.${field} is required`,
          },
          400
        );
      }
    }

    // Build payload and send webhook
    const payload = buildWebhookPayload(alert, baseUrl);
    const result = await sendAlertWebhook(webhookUrl, payload);

    if (result.success) {
      return c.json(
        {
          success: true,
          statusCode: result.statusCode,
          message: 'Webhook sent successfully',
        },
        200
      );
    }

    // Return error but still 200 since this is best-effort
    return c.json(
      {
        success: false,
        error: result.error,
        message: 'Webhook delivery failed',
      },
      502
    );
  } catch (error) {
    console.error('Webhook notification error:', error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/notify/health
 * Health check for notification service
 */
notificationRoutes.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'notification',
    timestamp: new Date().toISOString(),
  });
});
