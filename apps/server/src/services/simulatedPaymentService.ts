/**
 * University presentation processor. No provider APIs, merchant credentials,
 * banking credentials or money transfers. All rails share this adapter.
 * The route owns authorization, balance validation and atomic persistence.
 * Replace this adapter with a gateway-confirmed result for a real deployment.
 */
export async function processSimulatedPayment(paymentRail: string) {
  await new Promise<void>(resolve => setTimeout(resolve, 900));
  const reference = crypto.randomUUID().toUpperCase();
  return {
    status: 'SUCCESS' as const,
    paymentReference: `PAY-${reference}`,
    channelReference: `TXN-${paymentRail}-${reference}`,
    officialReceiptNumber: `OR-MC-${reference}`,
    gatewayAuthCode: `AUTH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    settledAt: new Date(),
    isSimulatedDemo: true
  };
}
