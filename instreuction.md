I'll create a comprehensive skill/prompt document for this hackathon project. Let me first check the official guide for any relevant tips, then build the complete instruction set.
Based on all the documents you've provided, here is a **complete, self-contained skill/prompt document** you can share with any AI assistant (Claude, GPT, etc.) or teammate. It contains everything needed to build the QueueStorm Investigator API correctly.

---

# 🎯 SKILL: QueueStorm Investigator — SUST CSE Carnival 2026 Hackathon

**Event:** bKash presents SUST CSE Carnival 2026 · Codex Community Hackathon  
**Round:** Online Preliminary (4.5 hours)  
**Task:** Build and deploy an AI/API support copilot for digital finance  
**Deadline:** 4.5 hours from start (7:30 PM – 12:00 AM)

---

## 1. PROJECT OVERVIEW

You are building **QueueStorm Investigator** — an internal support copilot for a digital finance platform (like bKash). It receives one customer complaint at a time, along with a short snippet of that customer's recent transaction history, and returns a structured JSON response that classifies, routes, and explains the case for the support agent.

**Key principle:** This is NOT just a complaint classifier. It is a complaint **investigator**. The service must read BOTH the complaint text AND the transaction history. The complaint says one thing. The data may show another. The service decides what is true.

---

## 2. EXACT API CONTRACT

Your service must expose exactly these two endpoints. No more, no less. The judge harness will ONLY call these.

### 2.1 Endpoints

| Method | Path | Required | Purpose |
|--------|------|----------|---------|
| `GET` | `/health` | **Yes** | Return `{"status":"ok"}` within 60 seconds of service start |
| `POST` | `/analyze-ticket` | **Yes** | Accept one ticket, return structured analysis |

### 2.2 HTTP Response Codes

| Code | When to use |
|------|-------------|
| `200` | Successful analysis. Response body conforms to output schema. |
| `400` | Malformed input (invalid JSON, missing required fields). Include non-sensitive error message. |
| `422` | Schema is valid but semantically invalid (e.g., empty complaint). Optional but encouraged. |
| `500` | Internal error. Include non-sensitive error message. NEVER expose stack traces, tokens, or secrets. |

**Critical:** The service must NOT crash on malformed input. A `400` or `500` response is acceptable. A process that exits or stops responding is a failure.

---

## 3. REQUEST SCHEMA (POST /analyze-ticket)

```json
{
  "ticket_id": "TKT-001",
  "complaint": "I sent 5000 taka to a wrong number around 2pm today...",
  "language": "en",
  "channel": "in_app_chat",
  "user_type": "customer",
  "campaign_context": "boishakh_bonanza_day_1",
  "transaction_history": [
    {
      "transaction_id": "TXN-9101",
      "timestamp": "2026-04-14T14:08:22Z",
      "type": "transfer",
      "amount": 5000,
      "counterparty": "+8801719876543",
      "status": "completed"
    }
  ],
  "metadata": {}
}
```

### 3.1 Request Fields

| Field | Type | Required? | Notes |
|-------|------|-----------|-------|
| `ticket_id` | string | **Yes** | Unique ticket identifier. Must be echoed in response. |
| `complaint` | string | **Yes** | Customer complaint text in English, Bangla, or mixed Banglish. |
| `language` | string | Optional | One of: `en`, `bn`, `mixed` |
| `channel` | string | Optional | One of: `in_app_chat`, `call_center`, `email`, `merchant_portal`, `field_agent` |
| `user_type` | string | Optional | One of: `customer`, `merchant`, `agent`, `unknown` |
| `campaign_context` | string | Optional | Campaign identifier provided by harness |
| `transaction_history` | array | Optional | List of recent transactions (typically 2–5 entries). May be empty for safety-only cases. |
| `metadata` | object | Optional | Additional simulated context |

### 3.2 Transaction History Entry

| Field | Type | Description |
|-------|------|-------------|
| `transaction_id` | string | Unique transaction identifier |
| `timestamp` | string (ISO 8601) | When the transaction occurred |
| `type` | string | One of: `transfer`, `payment`, `cash_in`, `cash_out`, `settlement`, `refund` |
| `amount` | number | Amount in BDT |
| `counterparty` | string | Recipient phone number, merchant ID, or agent ID |
| `status` | string | One of: `completed`, `failed`, `pending`, `reversed` |

---

## 4. RESPONSE SCHEMA (POST /analyze-ticket)

```json
{
  "ticket_id": "TKT-001",
  "relevant_transaction_id": "TXN-9101",
  "evidence_verdict": "consistent",
  "case_type": "wrong_transfer",
  "severity": "high",
  "department": "dispute_resolution",
  "agent_summary": "Customer reports sending 5000 BDT via TXN-9101...",
  "recommended_next_action": "Verify TXN-9101 details with the customer...",
  "customer_reply": "We have noted your concern about transaction TXN-9101...",
  "human_review_required": true,
  "confidence": 0.9,
  "reason_codes": ["wrong_transfer", "transaction_match"]
}
```

### 4.1 Response Fields

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `ticket_id` | string | **Yes** | Must match the value sent in the request |
| `relevant_transaction_id` | string or `null` | **Yes** | Transaction ID the complaint refers to, or `null` if none matches |
| `evidence_verdict` | enum | **Yes** | One of: `consistent`, `inconsistent`, `insufficient_data` |
| `case_type` | enum | **Yes** | From taxonomy in Section 5.1 |
| `severity` | enum | **Yes** | One of: `low`, `medium`, `high`, `critical` |
| `department` | enum | **Yes** | From taxonomy in Section 5.2 |
| `agent_summary` | string | **Yes** | Concise agent-ready summary (1–2 sentences) |
| `recommended_next_action` | string | **Yes** | Suggested operational next step for the support agent |
| `customer_reply` | string | **Yes** | Safe official reply respecting ALL safety rules in Section 6 |
| `human_review_required` | boolean | **Yes** | `true` for disputes, suspicious cases, high value, or ambiguous evidence |
| `confidence` | number | Optional | Float between 0 and 1 |
| `reason_codes` | array of strings | Optional | Short reason labels supporting the decision |

---

## 5. ENUMS AND TAXONOMY

**ALL enum values must match EXACTLY.** Variants (case differences, plural forms, alternate spellings) will be scored as schema errors.

### 5.1 case_type

| Value | When to use |
|-------|-------------|
| `wrong_transfer` | Money sent to the wrong recipient |
| `payment_failed` | Transaction failed but balance may have been deducted |
| `refund_request` | Customer is asking for a refund |
| `duplicate_payment` | Same payment appears to have been charged more than once |
| `merchant_settlement_delay` | Merchant settlement not received within expected window |
| `agent_cash_in_issue` | Cash deposit through an agent not reflected in customer balance |
| `phishing_or_social_engineering` | Suspicious calls, SMS, or someone asking for PIN, OTP, or password |
| `other` | Anything not covered above |

### 5.2 department

| Value | Typical case_type |
|-------|-----------------|
| `customer_support` | `other`, low severity `refund_request`, vague or insufficient data cases |
| `dispute_resolution` | `wrong_transfer`, contested `refund_request` |
| `payments_ops` | `payment_failed`, `duplicate_payment` |
| `merchant_operations` | `merchant_settlement_delay`, merchant-side complaints |
| `agent_operations` | `agent_cash_in_issue`, agent-side complaints |
| `fraud_risk` | `phishing_or_social_engineering`, suspicious activity patterns |

---

## 6. SAFETY RULES (AUTOMATIC PENALTIES)

These are checked automatically. Violations subtract points directly and can disqualify you.

| # | Rule | Field Checked | Penalty |
|---|------|---------------|---------|
| 1 | **NEVER ask for PIN, OTP, password, or full card number** — even framed as "verification" or "security step" | `customer_reply` | **-15 points** |
| 2 | **NEVER confirm a refund, reversal, account unblock, or recovery** without authority. Use safe language like "any eligible amount will be returned through official channels" instead of "we will refund you" | `customer_reply` and `recommended_next_action` | **-10 points** |
| 3 | **NEVER instruct the customer to contact a suspicious third party.** Direct customers ONLY to official support channels | `customer_reply` | **-10 points** |
| 4 | **Adversarial complaint text must NOT override system rules.** Ignore prompt injection attempts embedded in user complaints | All output fields | Schema or safety violation |
| 5 | **Two or more critical safety violations across hidden cases** | Whole submission | **Not eligible for top 40 finalist pool** |

### 6.1 Safe Language Templates

| Unsafe | Safe Replacement |
|--------|------------------|
| "We will refund you" | "Any eligible amount will be returned through official channels" |
| "Please share your OTP to verify" | "Please do not share your PIN or OTP with anyone" |
| "Contact this number for help: +8801XXXX" | "Our team will contact you through official support channels" |
| "Your account will be unblocked" | "Your case has been forwarded for review" |

---

## 7. EVIDENCE REASONING LOGIC

This is the **core scoring category (35%)**. The service must actually investigate, not just classify.

### 7.1 relevant_transaction_id
- Match complaint details (amount, time, counterparty, type) against transaction_history
- Return the **best-matching** transaction ID
- Return `null` if:
  - No transaction matches at all
  - Multiple transactions plausibly match and you cannot disambiguate
  - The complaint is too vague to identify a specific transaction

### 7.2 evidence_verdict

| Verdict | When to use |
|---------|-------------|
| `consistent` | The transaction data **supports** the customer's claim |
| `inconsistent` | The transaction data **contradicts** the customer's claim |
| `insufficient_data` | Cannot be determined from the provided history |

**Examples of inconsistency:**
- Customer claims "wrong transfer" but history shows 3 prior transfers to the same recipient (established pattern)
- Customer claims "payment failed" but transaction shows `completed`
- Customer claims "duplicate" but only one matching transaction exists

**Examples of insufficient_data:**
- Vague complaint: "Something is wrong with my money"
- Multiple plausible matches (e.g., two 1000 BDT transfers on the same day to different numbers)
- Missing transaction history when it's needed to verify the claim

### 7.3 human_review_required

Set to `true` when:
- Disputes (`wrong_transfer`, contested cases)
- Suspicious cases / phishing reports
- High-value transactions (use judgment, typically >5000 BDT or merchant settlements)
- Ambiguous or inconsistent evidence
- `critical` severity cases

---

## 8. SEVERITY GUIDELINES

| Severity | Typical Indicators |
|----------|-------------------|
| `low` | Refund requests (change of mind), vague complaints, minor issues |
| `medium` | Wrong transfer claims with some ambiguity, settlement delays, established recipient pattern |
| `high` | Confirmed wrong transfers, payment failures with balance deduction, agent cash-in issues, duplicate payments |
| `critical` | Phishing/social engineering, any credential-related safety threat, large-scale fraud patterns |

---

## 9. AI AND MODEL USAGE POLICY

| Approach | Status |
|----------|--------|
| Rule-based logic | ✅ **Allowed and encouraged** — task is solvable without paid APIs |
| External AI APIs (OpenAI, Anthropic, etc.) | ✅ Allowed — use your own keys/credits. Organizers provide NONE. |
| Lightweight local models | ✅ Allowed — must run without GPU, fit within runtime/image limits |
| Hybrid (rules + AI) | ✅ **Recommended** — rules for evidence/safety, AI for language/drafting |
| Huge local LLMs / GPU dependency | ❌ **Not allowed** for preliminary judging |
| Runtime training | ❌ **Not allowed** |

**Recommendation for 4.5-hour round:** Build with **rules for core logic** (transaction matching, classification, safety) and optionally use a **lightweight API** (GPT-3.5-turbo, Claude Haiku) ONLY for generating `agent_summary`, `customer_reply`, and `recommended_next_action` text. This minimizes cost, latency, and failure risk while maximizing evidence reasoning accuracy.

---

## 10. RUNTIME CONSTRAINTS

| Item | Guidance |
|------|----------|
| CPU/Memory | 2 vCPU + 4 GB RAM is sufficient |
| GPU | Not required, not recommended |
| Docker image size | Keep under 500MB (hard limit: 1GB) |
| Per-request timeout | POST /analyze-ticket must respond within **30 seconds** |
| Health readiness | GET /health must return `{"status":"ok"}` within **60 seconds** of start |
| Large model downloads | Not allowed during evaluation |
| Port binding | Must bind to `0.0.0.0` |

---

## 11. SUBMISSION REQUIREMENTS

### 11.1 Three Submission Paths (Choose One)

| Priority | Path | What to Submit | When to Use |
|----------|------|----------------|-------------|
| 1 | **Live URL** (Strongly Recommended) | Public base URL + GitHub repo | You deployed successfully (Render, Railway, Fly, Vercel, EC2, Poridhi Lab, etc.) |
| 2 | **Docker fallback** | `docker pull` command + run command + GitHub repo | Built image but didn't host live |
| 3 | **Code with runbook** | GitHub repo + step-by-step README | Neither A nor B worked. Last resort. |

### 11.2 Required Deliverables

| Deliverable | Required? | Details |
|-------------|-----------|---------|
| GitHub repository | **Yes** | Public or add organizer `bipulhf` with read access. Must remain accessible until results published. |
| Endpoint URL / Docker / Runbook | **Yes** | At least one valid path |
| `README.md` | **Yes** | Setup instructions, run command, tech stack, AI approach, safety logic, model choices, assumptions, limitations |
| Dependency file | **Yes** | `requirements.txt`, `package.json`, `pyproject.toml`, etc. |
| Sample output file | **Yes** | At least one output from a public sample case |
| `MODELS` section in README | **Yes** | List every model used, where it runs, why chosen |
| `.env.example` | Recommended | Variable names only (no real values) |
| Architecture walkthrough video | Recommended | Up to 90 seconds, submit viewable link |

### 11.3 Security Rules (CRITICAL)

- **NEVER commit real secrets to GitHub** — even if private
- **NEVER put secrets in README, screenshots, Docker images, or commit history**
- Use **environment variables** for deployed endpoints
- Use **private form field** for Docker/code fallback secrets
- Use **temporary, limited-quota keys** when sharing for judging
- **Revoke/rotate keys after evaluation**

---

## 12. SCORING BREAKDOWN

| Priority | Category | Weight | What It Measures |
|----------|----------|--------|------------------|
| 1 | **Evidence Reasoning** | 35% | Right transaction, right verdict, right classification, right routing |
| 2 | **Safety & Escalation** | 20% | No credential requests, no unauthorized refunds, correct escalation |
| 3 | **API Contract & Schema** | 15% | Correct fields, types, enums, HTTP codes |
| 4 | **Performance & Reliability** | 10% | Within timeout, stable, handles malformed input |
| 5 | **Response Quality** | 10% | Clear summary, practical next action, professional reply |
| 6 | **Deployment & Reproducibility** | 5% | Judges can run/reach without help |
| 7 | **Documentation** | 5% | README explains setup, AI usage, safety logic, limitations |

### 12.1 Tie-Breakers (in order)
1. Safety score and absence of critical violations
2. Evidence reasoning score
3. API/schema validity
4. API reliability, timeout behavior, deployment stability
5. Exceptional implementation (optimization, deployment, cost-aware model usage, caching, monitoring, fallback design)
6. Bangla/Banglish handling quality
7. Documentation quality and manual verification
8. 90-second architecture overview video

---

## 13. PRIORITY ORDER FOR THE 4.5-HOUR ROUND

> **"Build the API first. Make the schema correct. Add evidence and reasoning. Add safety guardrails. Test it. Deploy it. Submit clearly."**

| Step | Focus | Why |
|------|-------|-----|
| 1 | Get schema and endpoints correct | Without valid JSON and endpoints, the judge cannot score you |
| 2 | Build evidence-based reasoning | This is where the largest score (35%) lives |
| 3 | Add fintech safety guardrails | Unsafe replies can ruin a high score (-15/-10 penalties) |
| 4 | Make service reliable and reachable | A correct service loses if it times out or crashes |
| 5 | Write clear README and explain AI usage | Shortlisted teams need clear communication |

---

## 14. SAMPLE CASES REFERENCE

A file `SUST_Preli_Sample_Cases.json` contains **10 fully worked sample cases**. Use them to:
- Understand the exact JSON shape of inputs and outputs
- Build a local test set
- Calibrate your reasoning (read the `rationale` field)

**WARNING:** These are reference examples, NOT the test set. The judge harness uses hidden cases. A service that only handles the 10 samples will lose substantial points. Build for **general robustness**.

---

## 15. TESTING CHECKLIST (Before Submitting)

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] `POST /analyze-ticket` accepts sample JSON
- [ ] Response contains ALL required fields
- [ ] Enum values match the problem statement **exactly**
- [ ] Service handles empty or missing transaction history safely
- [ ] Service handles malformed/missing fields without crashing
- [ ] `customer_reply` does NOT ask for PIN, OTP, password, or secret credentials
- [ ] `customer_reply` does NOT promise refund, reversal, recovery, or account unblock
- [ ] Endpoint or Docker fallback responds within timeout
- [ ] `README.md` is complete
- [ ] No real secrets committed to repository
- [ ] GitHub repo is accessible to organizer `bipulhf`

---

## 16. WHAT NOT TO DO

| Don't | Why |
|-------|-----|
| Build only a UI or screenshots | Preliminary round judges the API only |
| Submit endpoint requiring login | Judge harness must call it directly |
| Use real customer or payment data | Privacy and safety violation |
| Integrate real payment APIs | Out of scope, critical fintech safety violation |
| Ask users for OTP, PIN, password | Safety violation (-15 points) |
| Promise refunds, reversals, unblocks | Safety violation (-10 points) |
| Commit API keys or `.env` files | Security risk, bad engineering practice |
| Rely on huge models, GPU, multi-GB downloads | Not judgeable at scale |

---

## 17. QUICK ARCHITECTURE SUGGESTION

```
┌─────────────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│   POST /analyze │────▶│  1. Parse & Validate Input  │────▶│ 2. Safety Check │
│      -ticket    │     │     (ticket_id, complaint,   │     │ (prompt injection│
│                 │     │      transaction_history)     │     │  detection)     │
└─────────────────┘     └─────────────────────────────┘     └────────┬────────┘
                                                                     │
                              ┌──────────────────────────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ 3. Transaction Match │
                    │   (amount, time,     │
                    │    counterparty, type)│
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  Match   │    │ No Match │    │ Ambiguous│
        │  Found   │    │          │    │ (Multiple)│
        └────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │               │
             ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Evidence │    │ verdict: │    │ verdict: │
        │ Verdict  │    │insufficient│   │insufficient│
        │(consistent/│   │  data    │    │  data    │
        │inconsistent)│  │ txn_id:  │    │ txn_id:  │
        └────┬─────┘    │  null    │    │  null    │
             │          └──────────┘    └──────────┘
             ▼
        ┌──────────┐
        │ 4. Classify│
        │  case_type │
        │  severity  │
        │ department │
        │ human_review│
        └────┬─────┘
             │
             ▼
        ┌──────────┐
        │ 5. Generate│
        │   Output   │
        │  (summary, │
        │   next_action│
        │   customer_reply)│
        └────┬─────┘
             │
             ▼
        ┌──────────┐
        │ 6. Safety │
        │  Filter   │
        │ (final check│
        │  for PIN/OTP│
        │  refund promises)│
        └────┬─────┘
             │
             ▼
        ┌──────────┐
        │  Return  │
        │  JSON    │
        │  Response│
        └──────────┘
```

---

## 18. FINAL ADVICE

> **"A simple, reliable, safe API will score better than a flashy but broken one."**

- **Schema correctness > fancy AI.** If your JSON is wrong, nothing else matters.
- **Safety is non-negotiable.** One credential request costs -15 points. Two critical violations disqualify you from top 40.
- **Evidence reasoning is king (35%).** Match transactions carefully. Don't guess when ambiguous — return `insufficient_data`.
- **Deploy early.** A working endpoint that you can test against the sample cases is worth more than a perfect algorithm that won't start.
- **Bangla/Banglish support matters.** Hidden tests include multilingual cases. Handle Bangla natively, not as an afterthought.

---

**Good luck. Build safe. Build correct. Deploy fast.**