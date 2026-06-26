import { CaseType, EvidenceVerdict, Transaction } from '../types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-4-31b-it:free';

export interface GeneratedText {
  agentSummary: string;
  recommendedNextAction: string;
  customerReply: string;
}

interface GenInput {
  complaint: string;
  caseType: CaseType;
  evidenceVerdict: EvidenceVerdict;
  matchedTransaction: Transaction | null;
}

export async function generateTexts(input: GenInput): Promise<GeneratedText> {
  if (OPENROUTER_API_KEY) {
    try {
      return await generateWithAI(input);
    } catch (err) {
      console.error('AI text generation failed, using templates:', err);
    }
  }
  return generateWithTemplates(input);
}

async function generateWithAI(input: GenInput): Promise<GeneratedText> {
  const { complaint, caseType, evidenceVerdict, matchedTransaction } = input;

  const prompt = `You are a support copilot for a digital finance platform (like bKash). Generate structured JSON support responses.

COMPLAINT: ${complaint}
CASE_TYPE: ${caseType}
EVIDENCE_VERDICT: ${evidenceVerdict}
MATCHED_TRANSACTION: ${matchedTransaction ? JSON.stringify(matchedTransaction) : 'null'}

Return ONLY a valid JSON object with exactly these three keys (no markdown, no extra text):
- "agent_summary": 1-2 sentence factual summary for the internal support agent
- "recommended_next_action": specific operational step for the support agent
- "customer_reply": safe, empathetic official reply to the customer

MANDATORY SAFETY RULES for customer_reply:
1. NEVER ask for PIN, OTP, password, or any credentials
2. NEVER promise a refund, reversal, or account unblock — use "any eligible amount will be returned through official channels"
3. NEVER direct to a third-party number — say "our team will contact you through official support channels"
4. Be empathetic but non-committal on outcomes`;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    }),
    signal: AbortSignal.timeout(27000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const raw: string = data.choices[0].message.content;

  // Extract JSON object — model may prepend prose before the JSON block
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in AI response: ${raw.slice(0, 100)}`);
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    agentSummary: String(parsed.agent_summary),
    recommendedNextAction: String(parsed.recommended_next_action),
    customerReply: String(parsed.customer_reply),
  };
}

function generateWithTemplates(input: GenInput): GeneratedText {
  const { caseType, evidenceVerdict, matchedTransaction } = input;
  const txnRef = matchedTransaction ? ` (${matchedTransaction.transaction_id})` : '';
  const amt = matchedTransaction ? ` of ${matchedTransaction.amount} BDT` : '';

  const summaries: Record<CaseType, string> = {
    wrong_transfer: `Customer reports an incorrect transfer${amt}${txnRef}. Evidence verdict: ${evidenceVerdict}.`,
    payment_failed: `Customer reports a failed payment${amt}${txnRef}. Evidence verdict: ${evidenceVerdict}.`,
    refund_request: `Customer is requesting a refund${amt}${txnRef}.`,
    duplicate_payment: `Customer reports a duplicate charge${amt}${txnRef}. Evidence verdict: ${evidenceVerdict}.`,
    merchant_settlement_delay: `Merchant reports settlement delay${txnRef}. Evidence verdict: ${evidenceVerdict}.`,
    agent_cash_in_issue: `Customer reports cash-in not reflected in balance${txnRef}. Evidence verdict: ${evidenceVerdict}.`,
    phishing_or_social_engineering: `Customer reports a phishing or social engineering attempt. Immediate security review required.`,
    other: `Customer submitted a support request. Manual review required.`,
  };

  const nextActions: Record<CaseType, string> = {
    wrong_transfer: `Verify transaction details${txnRef} with the customer. If a wrong transfer is confirmed, escalate to dispute resolution for a reversal investigation.`,
    payment_failed: `Check transaction status${txnRef} in the payment system. If balance was deducted without delivery, escalate to payments ops for remediation.`,
    refund_request: `Review eligibility per refund policy. Submit through the official refund process if eligible.`,
    duplicate_payment: `Cross-check all transactions in the reported window. If a duplicate is confirmed, initiate a reversal through payments ops.`,
    merchant_settlement_delay: `Check the settlement queue for this merchant. Verify expected settlement window and escalate if beyond SLA.`,
    agent_cash_in_issue: `Verify the cash-in record with agent operations. Cross-check agent logs with the customer account balance.`,
    phishing_or_social_engineering: `Flag the account for immediate security review. Alert the fraud risk team. Do not share case details until security review is complete.`,
    other: `Review complaint and route to the appropriate team for investigation.`,
  };

  const replies: Record<CaseType, string> = {
    wrong_transfer: `Thank you for contacting us. We have received your report regarding the transfer${txnRef}. Our team is reviewing your case and any eligible amount will be returned through official channels. We will update you within 3–5 business days.`,
    payment_failed: `Thank you for reaching out. We have noted your concern about transaction${txnRef}. Our payments team is investigating, and any eligible amount will be returned through official channels within 3–5 business days.`,
    refund_request: `Thank you for your request. We have received your refund inquiry and our team will review your eligibility. Any eligible amount will be returned through official channels. We will notify you within 3–5 business days.`,
    duplicate_payment: `Thank you for reporting this. We have noted your concern about a possible duplicate transaction${txnRef}. Our team is investigating, and any eligible amount will be returned through official channels within 3–5 business days.`,
    merchant_settlement_delay: `Thank you for contacting us. We have noted your settlement inquiry${txnRef}. Our merchant operations team is reviewing your case and will ensure settlement is processed within the expected timeframe.`,
    agent_cash_in_issue: `Thank you for reaching out. We have noted your cash-in concern${txnRef}. Our team is verifying the transaction with our agent network. Your balance will be updated once verification is complete within 1–2 business days.`,
    phishing_or_social_engineering: `Thank you for reporting this suspicious activity. Please do not share your PIN, OTP, or password with anyone — our team will never ask for these. Your case has been forwarded to our security team for review. Stay vigilant and report any further suspicious contact.`,
    other: `Thank you for contacting us. We have received your request and our team will review it. We will reach out through official support channels with an update shortly.`,
  };

  return {
    agentSummary: summaries[caseType],
    recommendedNextAction: nextActions[caseType],
    customerReply: replies[caseType],
  };
}
