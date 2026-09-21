// lib/payment/types/payment.ts
export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    order_id?: string;
    status?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
  };
  create_time: string;
}

export interface PayPalWebhookLog {
  id: string;
  event_id: string;
  event_type: string;
  order_id?: string;
  paypal_order_id?: string;
  payload: any;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

export interface ShareLink {
  token: string;
  url: string;
  expires_at?: string;
}