/**
 * ICOH Portal - Email Dispatch Service
 * Dispatches transactional notifications to the employee's official ICOH email address.
 * Follows security mandate: Guides users to sign into the secure portal rather than attaching sensitive PDFs.
 */

export interface EmailPayload {
  toEmail: string;
  recipientName: string;
  subject: string;
  template: 'request_submitted' | 'processing' | 'payslip_ready' | 'rejected' | 'account_event';
  requestId?: string;
  monthName?: string;
  year?: number;
  remarks?: string;
}

export interface EmailResponse {
  success: boolean;
  deliveryStatus: 'DELIVERED' | 'NOT_CONFIGURED' | 'FAILED';
  message: string;
}

export async function sendEmailNotification(payload: EmailPayload): Promise<EmailResponse> {
  try {
    const res = await fetch('/api/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        success: true,
        deliveryStatus: 'DELIVERED',
        message: data.message || `Official notification dispatched to ${payload.toEmail}.`,
      };
    }
    return {
      success: false,
      deliveryStatus: data.deliveryStatus || 'NOT_CONFIGURED',
      message: data.message || data.error || 'Email transport is not configured.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      deliveryStatus: 'FAILED',
      message: `Server email dispatch warning: ${msg}`,
    };
  }
}

