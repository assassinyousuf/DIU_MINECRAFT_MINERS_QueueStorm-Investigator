import { Router, Request, Response } from 'express';
import { TicketRequest, TicketResponse } from '../types';
import { matchTransaction } from '../services/transactionMatcher';
import {
  classifyCaseType,
  detectPromptInjection,
  determineEvidenceVerdict,
  determineSeverity,
  determineDepartment,
  requiresHumanReview,
} from '../services/caseClassifier';
import { sanitizeCustomerReply } from '../services/safetyGuard';
import { generateTexts } from '../services/textGenerator';

const router = Router();

router.all('/', async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST /analyze-ticket' });
    return;
  }
  try {
    const body = req.body as Partial<TicketRequest>;

    // ── Validate required fields ────────────────────────────────────────────
    if (!body.ticket_id || typeof body.ticket_id !== 'string') {
      res.status(400).json({ error: 'ticket_id is required and must be a string' });
      return;
    }

    if (!body.complaint || typeof body.complaint !== 'string') {
      res.status(400).json({ error: 'complaint is required and must be a string' });
      return;
    }

    if (body.complaint.trim().length === 0) {
      res.status(422).json({ error: 'complaint must not be empty' });
      return;
    }

    const ticket = body as TicketRequest;
    const transactions = ticket.transaction_history ?? [];

    // ── Prompt injection detection ──────────────────────────────────────────
    const injected = detectPromptInjection(ticket.complaint);

    // ── Core reasoning ──────────────────────────────────────────────────────
    let { transaction: matchedTxn, confidence, reason_codes } = matchTransaction(
      ticket.complaint,
      transactions
    );

    const caseType = injected ? 'other' : classifyCaseType(ticket.complaint, transactions);

    // For duplicate_payment with ambiguous match, fall back to first completed transaction
    if (caseType === 'duplicate_payment' && !matchedTxn && transactions.length > 0) {
      const firstCompleted = transactions.find((t) => t.status === 'completed');
      if (firstCompleted) {
        matchedTxn = firstCompleted;
        confidence = 0.5;
        reason_codes = [...reason_codes, 'duplicate_fallback_match'];
      }
    }

    const evidenceVerdict = determineEvidenceVerdict(caseType, matchedTxn, transactions);

    const severity = determineSeverity(caseType, matchedTxn, evidenceVerdict);
    const department = determineDepartment(caseType);
    const humanReview = requiresHumanReview(caseType, severity, evidenceVerdict);

    // ── Text generation ─────────────────────────────────────────────────────
    const texts = await generateTexts({
      complaint: ticket.complaint,
      caseType,
      evidenceVerdict,
      matchedTransaction: matchedTxn,
    });

    // ── Safety filter on customer reply ─────────────────────────────────────
    const { sanitized: safeReply, violations } = sanitizeCustomerReply(texts.customerReply);

    const allReasonCodes = [
      ...reason_codes,
      ...(injected ? ['prompt_injection_detected'] : []),
      ...(violations.length > 0 ? ['reply_sanitized'] : []),
    ];

    // ── Build response ──────────────────────────────────────────────────────
    const response: TicketResponse = {
      ticket_id: ticket.ticket_id,
      relevant_transaction_id: matchedTxn?.transaction_id ?? null,
      evidence_verdict: evidenceVerdict,
      case_type: caseType,
      severity,
      department,
      agent_summary: texts.agentSummary,
      recommended_next_action: texts.recommendedNextAction,
      customer_reply: safeReply,
      human_review_required: humanReview,
      confidence: parseFloat(confidence.toFixed(2)),
      reason_codes: allReasonCodes,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('[/analyze-ticket] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

export default router;
