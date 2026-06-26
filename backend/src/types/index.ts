export type TransactionType = 'transfer' | 'payment' | 'cash_in' | 'cash_out' | 'settlement' | 'refund';
export type TransactionStatus = 'completed' | 'failed' | 'pending' | 'reversed';
export type Language = 'en' | 'bn' | 'mixed';
export type Channel = 'in_app_chat' | 'call_center' | 'email' | 'merchant_portal' | 'field_agent';
export type UserType = 'customer' | 'merchant' | 'agent' | 'unknown';

export interface Transaction {
  transaction_id: string;
  timestamp: string;
  type: TransactionType;
  amount: number;
  counterparty: string;
  status: TransactionStatus;
}

export interface TicketRequest {
  ticket_id: string;
  complaint: string;
  language?: Language;
  channel?: Channel;
  user_type?: UserType;
  campaign_context?: string;
  transaction_history?: Transaction[];
  metadata?: Record<string, unknown>;
}

export type CaseType =
  | 'wrong_transfer'
  | 'payment_failed'
  | 'refund_request'
  | 'duplicate_payment'
  | 'merchant_settlement_delay'
  | 'agent_cash_in_issue'
  | 'phishing_or_social_engineering'
  | 'other';

export type EvidenceVerdict = 'consistent' | 'inconsistent' | 'insufficient_data';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Department =
  | 'customer_support'
  | 'dispute_resolution'
  | 'payments_ops'
  | 'merchant_operations'
  | 'agent_operations'
  | 'fraud_risk';

export interface TicketResponse {
  ticket_id: string;
  relevant_transaction_id: string | null;
  evidence_verdict: EvidenceVerdict;
  case_type: CaseType;
  severity: Severity;
  department: Department;
  agent_summary: string;
  recommended_next_action: string;
  customer_reply: string;
  human_review_required: boolean;
  confidence?: number;
  reason_codes?: string[];
}
