import type { AppContext } from '../context';

/**
 * Patient and staff emails. They never contain amounts, diagnoses, record numbers
 * or links with secrets in the query string: an email is not a secure channel.
 */
function deliver(c: AppContext, to: string, subject: string, text: string): void {
  const { mailer, logger } = c.var.services;
  c.var.defer(
    mailer.send({ to, subject, text }).catch((err: unknown) => {
      logger.log('error', 'email delivery failed', {
        requestId: c.var.requestId,
        errorMessage: err instanceof Error ? err.message : 'unknown',
      });
    }),
  );
}

export function sendSignInCode(c: AppContext, to: string, code: string, facilityName: string): void {
  deliver(
    c,
    to,
    `${code} is your MedCore sign-in code`,
    [
      `Your MedCore sign-in code for ${facilityName} is:`,
      '',
      `    ${code}`,
      '',
      'It works once and expires in 10 minutes.',
      'Never share this code with anyone, including hospital staff. MedCore will never ask you for it.',
      '',
      'If you did not try to sign in, you can ignore this email.',
    ].join('\n'),
  );
}

export function notifyBillReady(c: AppContext, to: string): void {
  deliver(
    c,
    to,
    'Your hospital statement is ready',
    [
      'Your hospital statement is ready in the MedCore app.',
      '',
      'Open the MedCore app and sign in with this email address to see an itemized,',
      'plain-language bill, question any charge, pay, or arrange a 0% interest payment plan.',
      '',
      'For your privacy, this email does not include amounts or medical details.',
    ].join('\n'),
  );
}

export function sendStaffInvite(
  c: AppContext,
  to: string,
  fullName: string,
  token: string,
  facilityName: string,
): void {
  // The token is in the URL fragment, which browsers never send to servers or in Referer headers.
  const url = `${c.var.services.config.publicAppUrl}/staff/accept-invite#token=${encodeURIComponent(token)}`;
  deliver(
    c,
    to,
    `You have been invited to MedCore at ${facilityName}`,
    [
      `Hello ${fullName},`,
      '',
      `An administrator at ${facilityName} created a MedCore staff account for you.`,
      `Set your password here within 72 hours: ${url}`,
      '',
      'You will then set up an authenticator app for two-step sign-in.',
      'If you did not expect this, ignore this email and tell your IT team.',
    ].join('\n'),
  );
}
