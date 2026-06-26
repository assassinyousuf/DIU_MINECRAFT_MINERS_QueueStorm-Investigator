import { Transaction } from '../types';

export interface MatchResult {
  transaction: Transaction | null;
  confidence: number;
  reason_codes: string[];
}

function convertBanglaToArabic(bangla: string): number {
  const map: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const arabic = bangla.split('').map((c) => map[c] ?? c).join('');
  return parseInt(arabic, 10) || 0;
}

function extractAmounts(text: string): number[] {
  const amounts = new Set<number>();

  // Arabic numerals: matches 5000, 5,000, 5000.00 — \d+ avoids truncating 4+ digit numbers
  const numericRe = /\b(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:taka|tk\.?|bdt|৳)?\b/gi;
  for (const m of text.matchAll(numericRe)) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n > 0 && n < 1e8) amounts.add(n);
  }

  // Bangla/Banglish thousand/lakh multipliers
  for (const m of text.matchAll(/(\d+)\s*(?:হাজার|hajar|hazar|thousand)/gi))
    amounts.add(parseInt(m[1]) * 1_000);
  for (const m of text.matchAll(/(\d+)\s*(?:লাখ|লক্ষ|lakh|lac)/gi))
    amounts.add(parseInt(m[1]) * 100_000);

  // Bangla numerals (e.g. ৫০০০)
  for (const m of text.matchAll(/([০-৯]+)\s*(?:টাকা|তাকা)?/g)) {
    const n = convertBanglaToArabic(m[1]);
    if (n > 0) amounts.add(n);
  }

  return [...amounts];
}

function extractPhones(text: string): string[] {
  const phones: string[] = [];
  for (const m of text.matchAll(/(?:\+88)?01[3-9]\d{8}/g)) phones.push(m[0]);
  return phones;
}

function normalisePhone(p: string): string {
  return p.replace(/^\+88/, '').replace(/^0/, '');
}

function parseDateHint(text: string): Date | null {
  const now = new Date();
  if (/\b(today|আজ|aaj)\b/i.test(text)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (/\b(yesterday|গতকাল|gotokal)\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

export function matchTransaction(complaint: string, transactions: Transaction[]): MatchResult {
  if (!transactions || transactions.length === 0) {
    return { transaction: null, confidence: 0, reason_codes: ['no_transaction_history'] };
  }

  const amounts = extractAmounts(complaint);
  const phones = extractPhones(complaint);
  const dateHint = parseDateHint(complaint);
  const lower = complaint.toLowerCase();

  interface Scored { txn: Transaction; score: number; codes: string[] }

  const scored: Scored[] = transactions.map((txn) => {
    let score = 0;
    const codes: string[] = [];

    // Amount match (±1 %)
    if (amounts.length > 0 && amounts.some((a) => Math.abs(a - txn.amount) / (txn.amount || 1) < 0.01)) {
      score += 40;
      codes.push('amount_match');
    }

    // Counterparty / phone match
    if (phones.length > 0) {
      const cpNorm = normalisePhone(txn.counterparty);
      const hit = phones.some((p) => {
        const pn = normalisePhone(p);
        return cpNorm.endsWith(pn.slice(-8)) || pn.endsWith(cpNorm.slice(-8));
      });
      if (hit) {
        score += 35;
        codes.push('counterparty_match');
      }
    }

    // Date match
    if (dateHint) {
      const txnDate = new Date(txn.timestamp);
      const txnDay = new Date(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate());
      if (txnDay.getTime() === dateHint.getTime()) {
        score += 15;
        codes.push('date_match');
      }
    }

    // Transaction type hint
    const typeHints: Record<string, RegExp> = {
      transfer: /\b(send|sent|transfer|pathiye|diyechi|পাঠিয়েছি|পাঠিয়েছে)\b/i,
      payment: /\b(pay|payment|paid|bill|বিল)\b/i,
      cash_in: /\b(cash.?in|deposit|joma|জমা)\b/i,
      cash_out: /\b(cash.?out|withdraw|তুলেছি)\b/i,
    };
    if (typeHints[txn.type]?.test(lower)) {
      score += 10;
      codes.push('type_match');
    }

    return { txn, score, codes };
  });

  scored.sort((a, b) => b.score - a.score);

  // Ambiguity: top two tied with non-zero score
  if (scored.length >= 2 && scored[0].score > 0 && scored[0].score === scored[1].score) {
    return { transaction: null, confidence: 0.3, reason_codes: ['ambiguous_match'] };
  }

  if (scored[0].score === 0) {
    return { transaction: null, confidence: 0.2, reason_codes: ['no_match_found'] };
  }

  return {
    transaction: scored[0].txn,
    confidence: Math.min(scored[0].score / 90, 1.0),
    reason_codes: scored[0].codes,
  };
}
