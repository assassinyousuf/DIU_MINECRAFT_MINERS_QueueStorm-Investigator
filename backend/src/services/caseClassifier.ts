import { CaseType, Department, EvidenceVerdict, Severity, Transaction } from '../types';

// ── Prompt-injection guard ───────────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|your)\s+(instructions?|rules?|guidelines?)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /forget\s+(your|all|the)\s+(rules?|instructions?|training)/i,
  /you\s+are\s+now\s+(a|an)/i,
  /new\s+instructions?:/i,
  /override\s+(safety|mode|rules?)/i,
  /\[INST\]/,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

// ── Case-type classifiers ────────────────────────────────────────────────────
const PHISHING = [
  /\b(otp|pin|password|পাসওয়ার্ড|পিন|ওটিপি)\s*(share|দিয়েছি|চাইছে|চাইলো|দিয়ে\s*ফেলেছি)\b/i,
  /\b(scam|fraud|ফ্রড|প্রতারণা|ধোঁকা)\b/i,
  /\b(suspicious|unknown|অচেনা)\s+(call|sms|text|message|number)\b/i,
  /\b(fake|impersonat|pretend|ভুয়া|পরিচয়\s*দিচ্ছে)\b/i,
  /ask(?:ed|ing)?\s+(?:me\s+)?(?:for\s+)?(?:my\s+)?(otp|pin|password)/i,
  /চাচ্ছে|মাগছে/i,
  /someone\s+call(?:ed|ing)/i,
];

const WRONG_TRANSFER = [
  /wrong\s*(?:number|no\.?|num|person|recipient)/i,
  /ভুল\s*(?:নম্বর|নাম্বার|নম্বরে|নাম্বারে|মানুষ|লোক)/i,
  /sent\s+to\s+(?:the\s+)?wrong/i,
  /mistakenly\s+(?:sent|transferred?|diyechi)/i,
  /ভুলে\s+(?:পাঠিয়েছি|দিয়েছি|পাঠাইছি)/i,
  /wrong\s+transfer/i,
];

const PAYMENT_FAILED = [
  /payment\s+(?:failed|fail|unsuccessful|hoy\s*ni|hoy\s*nai|হয়নি)/i,
  /transaction\s+(?:failed|unsuccessful)/i,
  /balance\s+(?:deducted|cut|কমেছে|কাটা\s*গেছে)\b.{0,40}(?:not\s+received?|hoy\s*ni|পাইনি)/i,
  /টাকা\s+(?:কাটা\s+গেছে|কেটেছে)\b/i,
  /merchant\s+(?:did\s+not\s+receive|receive\s+(?:kore|করেনি))/i,
  /কাটা\s+গেছে\b.{0,30}(?:কিন্তু|but)/i,
];

const DUPLICATE = [
  /\b(duplicate|double\s+(?:charge|payment|cut|deduct))\b/i,
  /দুইবার|দুবার|দুই\s+বার/i,
  /charged\s+twice|payment\s+twice|twice/i,
  /same\s+(?:amount|transaction)\s+(?:twice|two\s+times)/i,
];

const MERCHANT_SETTLEMENT = [
  /\b(settlement|সেটেলমেন্ট)\b/i,
  /merchant\s+(?:payment|settlement|receive|পাইনি)/i,
  /business\s+(?:payment|settlement)/i,
];

const AGENT_CASH_IN = [
  /cash[-\s]?in/i,
  /ক্যাশ[-\s]?ইন/i,
  /agent\s+(?:kore|diye|theke|থেকে|দিয়ে)/i,
  /balance\s+(?:add|update|আসেনি|আসে\s*নি)/i,
  /জমা\s+হয়নি|জমা\s+হয়\s*নি/i,
];

const REFUND = [
  /\brefund\b/i,
  /\bফেরত\b/i,
  /money\s+back/i,
  /টাকা\s+ফেরত/i,
  /return\s+(?:koro|koren|dao|দাও|করুন)/i,
  /cancel\s+(?:koro|করুন)/i,
  /বাতিল/i,
];

export function classifyCaseType(complaint: string, transactions: Transaction[]): CaseType {
  if (detectPromptInjection(complaint)) return 'other';

  if (PHISHING.some((p) => p.test(complaint))) return 'phishing_or_social_engineering';
  if (WRONG_TRANSFER.some((p) => p.test(complaint))) return 'wrong_transfer';
  if (PAYMENT_FAILED.some((p) => p.test(complaint))) return 'payment_failed';
  if (DUPLICATE.some((p) => p.test(complaint))) return 'duplicate_payment';
  if (AGENT_CASH_IN.some((p) => p.test(complaint))) return 'agent_cash_in_issue';

  if (MERCHANT_SETTLEMENT.some((p) => p.test(complaint))) {
    const hasSettlement = transactions?.some((t) => t.type === 'settlement');
    if (hasSettlement || /merchant|ব্যবসা|দোকান/i.test(complaint))
      return 'merchant_settlement_delay';
  }

  if (REFUND.some((p) => p.test(complaint))) return 'refund_request';

  // Fallback: infer from transaction data
  if (transactions?.some((t) => t.status === 'failed')) return 'payment_failed';
  if (transactions?.some((t) => t.type === 'settlement')) return 'merchant_settlement_delay';
  if (transactions?.some((t) => t.type === 'cash_in' && t.status === 'pending'))
    return 'agent_cash_in_issue';

  return 'other';
}

export function determineEvidenceVerdict(
  caseType: CaseType,
  matchedTxn: Transaction | null,
  allTransactions: Transaction[]
): EvidenceVerdict {
  // Duplicate payment: check the full history regardless of whether a single txn was matched
  if (caseType === 'duplicate_payment') {
    const groups = new Map<string, Transaction[]>();
    for (const t of allTransactions) {
      const k = `${t.amount}_${t.type}`;
      const group = groups.get(k) ?? [];
      group.push(t);
      groups.set(k, group);
    }
    const dupGroup = [...groups.values()].find(
      (g) => g.filter((t) => t.status === 'completed').length >= 2
    );
    if (dupGroup) return 'consistent';
    if (allTransactions.length === 0) return 'insufficient_data';
    return 'inconsistent';
  }

  if (!matchedTxn) return 'insufficient_data';

  switch (caseType) {
    case 'wrong_transfer': {
      // Established pattern check: same counterparty appears 3+ times → inconsistent
      const sameCounterparty = allTransactions.filter(
        (t) => t.counterparty === matchedTxn.counterparty && t.type === 'transfer'
      );
      if (sameCounterparty.length >= 3) return 'inconsistent';
      if (matchedTxn.status === 'completed') return 'consistent';
      if (matchedTxn.status === 'reversed') return 'inconsistent';
      return 'consistent';
    }

    case 'payment_failed': {
      if (matchedTxn.status === 'failed') return 'consistent';
      if (matchedTxn.status === 'completed') return 'inconsistent';
      if (matchedTxn.status === 'pending') return 'insufficient_data';
      return 'consistent';
    }

    case 'refund_request': {
      if (matchedTxn.status === 'reversed') return 'inconsistent'; // already reversed
      return 'consistent';
    }

    case 'merchant_settlement_delay': {
      if (matchedTxn.status === 'pending') return 'consistent';
      if (matchedTxn.status === 'completed') return 'inconsistent'; // claim of delay but settled
      return 'insufficient_data';
    }

    case 'agent_cash_in_issue': {
      if (matchedTxn.status === 'pending') return 'consistent';
      if (matchedTxn.status === 'completed') return 'inconsistent'; // cash-in processed
      return 'insufficient_data';
    }

    case 'phishing_or_social_engineering':
      return 'insufficient_data'; // not verifiable from transaction history

    default:
      return 'insufficient_data';
  }
}

export function determineSeverity(
  caseType: CaseType,
  matchedTxn: Transaction | null,
  verdict: EvidenceVerdict
): Severity {
  if (caseType === 'phishing_or_social_engineering') return 'critical';

  const isHighValue = matchedTxn != null && matchedTxn.amount >= 5_000;

  switch (caseType) {
    case 'wrong_transfer':
      return isHighValue ? 'high' : 'medium';

    case 'payment_failed':
      if (verdict === 'inconsistent') return 'high'; // balance cut but shows completed
      return isHighValue ? 'high' : 'medium';

    case 'duplicate_payment':
    case 'agent_cash_in_issue':
      return 'high';

    case 'merchant_settlement_delay':
      return isHighValue ? 'high' : 'medium';

    case 'refund_request':
      return 'low';

    case 'other':
    default:
      return 'low';
  }
}

export function determineDepartment(caseType: CaseType): Department {
  switch (caseType) {
    case 'wrong_transfer':
      return 'dispute_resolution';
    case 'payment_failed':
    case 'duplicate_payment':
      return 'payments_ops';
    case 'merchant_settlement_delay':
      return 'merchant_operations';
    case 'agent_cash_in_issue':
      return 'agent_operations';
    case 'phishing_or_social_engineering':
      return 'fraud_risk';
    case 'refund_request':
    case 'other':
    default:
      return 'customer_support';
  }
}

export function requiresHumanReview(
  caseType: CaseType,
  severity: Severity,
  verdict: EvidenceVerdict
): boolean {
  if (severity === 'critical' || severity === 'high') return true;
  if (verdict === 'inconsistent') return true;
  if (verdict === 'insufficient_data' && caseType !== 'other') return true;

  switch (caseType) {
    case 'wrong_transfer':
    case 'phishing_or_social_engineering':
    case 'duplicate_payment':
    case 'agent_cash_in_issue':
      return true;
    default:
      return false;
  }
}
