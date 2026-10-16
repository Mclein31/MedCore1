import { Context } from 'hono';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    timestamp: string;
  };
}

export function apiError(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503,
  code: string,
  message: string,
  details?: ApiErrorDetail[]
) {
  const envelope: ApiErrorEnvelope = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
  return c.json(envelope, status);
}
