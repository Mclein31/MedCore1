export type SmsTemplateType = 'BILL_READY' | 'DOCTOR_PF_NUDGE' | 'PAYMENT_CONFIRMED' | 'INTAKE_ORIENTATION';
export type SmsDeliveryStatus = 'SIMULATED';

export interface SmsDispatchResult {
  success: boolean;
  messageId: string;
  simulated: true;
  isSimulated: true;
  recipientPhone: string;
  recipientName: string;
  messageBody: string;
  timestamp: string;
  provider: 'SIMULATOR';
  deliveryStatus: SmsDeliveryStatus;
  templateType: SmsTemplateType;
}

export interface SmsDispatchResponse {
  success: true;
  simulated: true;
  messageId: string;
  dispatch: SmsDispatchResult;
  cached?: boolean;
}
