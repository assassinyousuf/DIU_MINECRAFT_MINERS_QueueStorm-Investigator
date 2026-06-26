# QueueStorm Investigator

**Event:** bKash presents SUST CSE Carnival 2026 · Codex Community Hackathon  
**Team:** DIU_MINECRAFT_MINERS

An AI-powered support copilot for digital finance. Receives customer complaints + transaction history and returns structured JSON for support agents.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 · TypeScript · Express |
| Frontend | React 18 · TypeScript · Vite |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) — optional, falls back to templates |
| Infrastructure | Terraform · AWS EC2 (al2023, t3.micro) · nginx |
| Containerization | Docker (multi-stage build) |

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{"status":"ok"}` |
| `POST` | `/analyze-ticket` | Analyzes a support ticket |

---

## Quick Start (Local)

```bash
# 1. Backend
cd backend
cp .env.example .env          # add ANTHROPIC_API_KEY if you have one
npm install
npm run build
npm start                     # http://localhost:3000

# 2. Frontend (separate terminal, for development)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies API to :3000)
```

---

## Deploy to AWS (Terraform)

### Prerequisites
- Terraform ≥ 1.5 installed
- AWS credentials configured (`aws configure`)
- An SSH key pair (`ssh-keygen -t rsa -b 4096 -f ~/.ssh/queuestorm`)

### Steps

```bash
# 1. Configure AWS credentials
aws configure
# Access Key: AKIAS4B7IHAEOWUN7WVL
# Secret Key: (your secret key)
# Region: ap-southeast-1

# 2. Terraform init and apply
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: add your ssh_public_key and optionally anthropic_api_key

terraform init
terraform apply

# 3. Deploy app code (after terraform apply outputs the IP)
cd ..
.\deploy.ps1 -ServerIP <output-ip-from-terraform>
```

### Outputs

After `terraform apply` you get:
- `base_url` – the public HTTP endpoint
- `health_url` – health check URL
- `api_url` – analyze-ticket URL
- `ssh_command` – SSH command to access the instance

---

## Docker (Alternative)

```bash
docker build -t queuestorm .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... queuestorm
```

---

## AI Approach

- **Evidence reasoning** (35% of score): Pure rule-based logic — keyword matching in English + Bangla + Banglish, amount extraction, phone number matching, date hints, transaction status cross-referencing.
- **Text generation** (agent_summary, recommended_next_action, customer_reply): Claude Haiku when `ANTHROPIC_API_KEY` is set; structured templates otherwise.
- **Safety**: Dual-layer — post-generation regex filter strips any credential requests or refund promises from the customer reply regardless of AI output.
- **Prompt injection**: Detected and neutralized before any processing.

---

## Safety Logic

Every `customer_reply` passes through a safety filter that:
1. Removes any PIN/OTP/password requests
2. Removes unconditional refund/reversal promises → replaces with "any eligible amount will be returned through official channels"
3. Removes third-party number redirects

This runs **after** AI text generation, so it applies even if the model produces unsafe output.

---

## Models Used

| Model | Where | Why |
|---|---|---|
| `claude-haiku-4-5-20251001` | Backend (optional) | Fast, cheap, good at structured JSON output for support text |
| None (templates) | Backend (default) | Zero-latency fallback that guarantees schema compliance |

---

## Assumptions & Limitations

- Transaction matching uses heuristic scoring; ambiguous cases return `null` transaction and `insufficient_data` verdict.
- Bangla numeral support covers standard Unicode Bengali digits (০–৯).
- High-value threshold is fixed at 5,000 BDT; adjustable in `caseClassifier.ts`.
- No real payment APIs are called.

---

## Testing Checklist

- [x] `GET /health` → `{"status":"ok"}`
- [x] `POST /analyze-ticket` with sample cases returns all required fields
- [x] Enum values match spec exactly
- [x] Empty/missing transaction_history handled
- [x] Malformed JSON returns `400`
- [x] `customer_reply` never asks for PIN/OTP/password
- [x] `customer_reply` never promises refund/reversal
- [x] Prompt injection in complaint is neutralized
