# Reymedi

**A GenLayer-native service failure compensation court.**

Merchants escrow GEN into remedy pools. Claimants submit evidence of service failures. GenLayer validators run non-deterministic AI judgment to reach consensus on the fair remedy. Approved claimants receive GEN — on-chain, no intermediary, no admin approval.

> Built on [GenLayer](https://genlayer.com) · StudioNet (Chain ID 61999)

---

## What it does

| Actor | What they do |
|-------|-------------|
| **Merchant** | Register a profile, create a remedy pool, deposit GEN as escrow, respond to claims |
| **Claimant** | Browse active pools, submit a claim with evidence, track the case, receive payout |
| **GenLayer Validators** | Independently evaluate each claim using LLM prompts, reach consensus via equivalence principle |

The heart of Reymedi is `resolve_claim` — a GenLayer non-deterministic method that runs `gl.nondet.exec_prompt` on every validator node and reaches consensus with `gl.eq_principle.prompt_comparative`. No human admin decides the outcome.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4 |
| Contract | GenLayer Intelligent Contract (Python) |
| Network | StudioNet — Chain ID 61999 |
| SDK | `genlayer-js` |
| Wallet | MetaMask / injected EIP-1193 wallet |

---

## Live deployment

- **Frontend:** [Vercel](https://vercel.com)
- **Contract:** deployed on StudioNet
- **Explorer:** [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com)

---

## Contract: RemedyCourt

`contract/RemedyCourt.py`

A GenLayer Intelligent Contract written in Python. Manages remedy pools, claim lifecycle, GEN escrow, and AI-powered verdict resolution.

### Key methods

| Method | Role | Description |
|--------|------|-------------|
| `register_merchant` | Merchant | Register and auto-approve merchant profile |
| `create_pool` | Merchant | Create a remedy pool |
| `fund_pool` | Merchant | Deposit GEN into a pool (activates it) |
| `submit_claim` | Claimant | Open a case against an active pool |
| `respond_to_claim` | Merchant | Submit merchant rebuttal |
| `offer_settlement` | Merchant | Offer a GEN settlement amount |
| `accept_settlement` | Claimant | Accept the settlement offer |
| `reject_settlement` | Claimant | Reject settlement, escalate to AI review |
| `request_review` | Claimant | Forward case to GenLayer validators |
| `resolve_claim` | Any | **Trigger GenLayer non-deterministic AI judgment** |
| `claim_payout` | Claimant | Claim approved GEN remedy |
| `withdraw_available` | Merchant | Withdraw only unreserved pool GEN |
| `set_platform_paused` | Admin | Emergency platform pause |

### Non-deterministic AI verdict

`resolve_claim` is the GenLayer-native core of Reymedi:

```python
# Each validator independently runs the LLM prompt
raw = gl.nondet.exec_prompt(prompt, response_format="json")

# Validators reach consensus using the equivalence principle
consensus_json = gl.eq_principle.prompt_comparative(
    evaluate_once,
    principle="verdict_code must match exactly. payout_band must match exactly..."
)
```

The prompt evaluates the claim summary, pool policy, merchant response, evidence URLs, and proportionality — and returns a structured verdict:

### Verdict codes

```
NO_FAILURE | QUALIFYING_FAILURE | PARTIAL_FAILURE | MERCHANT_NOT_RESPONSIBLE
EXCLUDED_BY_POLICY | INSUFFICIENT_EVIDENCE | CLAIMANT_FAULT | DUPLICATE_OR_ABUSIVE | MANUAL_REVIEW
```

### Payout bands

```
NONE | SMALL | PARTIAL | FULL | MANUAL
```

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/Ifem1/Reymedi.git
cd Reymedi
npm install
```

### 2. Deploy the contract

Open `contract/RemedyCourt.py` in [GenLayer Studio](https://studio.genlayer.com), deploy to StudioNet, and copy the contract address.

### 3. Set the contract address

```env
# .env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### 4. Run the frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Add StudioNet to MetaMask

| Field | Value |
|-------|-------|
| Network name | StudioNet |
| RPC URL | `https://studio.genlayer.com/api` |
| Chain ID | `61999` |
| Currency | `GEN` |
| Explorer | `https://explorer-studio.genlayer.com` |

---

## Pages

### Public
| Route | Description |
|-------|-------------|
| `/` | Landing — clinic intro, how it works |
| `/pools` | Browse all active remedy pools |
| `/pool/[poolId]` | Pool details, policy, fund meter, open case CTA |
| `/proof/[claimId]` | Anonymised public proof receipt |

### Claimant (wallet-gated)
| Route | Description |
|-------|-------------|
| `/me` | Personal case dashboard |
| `/claim/new/[poolId]` | Intake Bay — submit a new claim |
| `/claim/[claimId]` | Private case room — evidence, timeline, payout |

### Merchant (wallet-gated)
| Route | Description |
|-------|-------------|
| `/merchant` | Merchant room — pools, registration |
| `/merchant/pool/[poolId]` | Pool health, claims triage, fund/withdraw |
| `/merchant/claim/[claimId]` | Respond to claim, offer settlement |

### Admin (wallet-gated)
| Route | Description |
|-------|-------------|
| `/admin` | Platform controls, merchant approvals, pause |

---

## Privacy model

| Data | Visibility |
|------|-----------|
| Pool name, policy, funded amount | Public |
| Anonymised verdict count and category | Public |
| Full claim statement, private evidence | Claimant only |
| Merchant response, funding controls | Merchant only |
| Complete claim packet + evidence URLs | Claimant + Merchant + Validators |
| Abuse logs, platform risk signals | Admin only |

Private evidence is never stored on-chain. Store sensitive files off-chain and submit only the keccak256 hash.

---

## Critical invariants

1. Claims cannot be approved without funded GEN in the pool.
2. Merchant cannot withdraw GEN reserved for active claims.
3. Claimant cannot claim payout twice for the same claim.
4. Public pages never expose claimant identity or private evidence.
5. Only the pool merchant can respond to claims on that pool.
6. Verdict payload stays minimal for validator equivalence.
7. All GEN movement is real on-chain transfer — no simulated payouts.

---

## Design system: Remedy Clinic

| Token | Value |
|-------|-------|
| Sterile Ink | `#101417` |
| Clinic Porcelain | `#F7F4EE` |
| Remedy Green | `#0FA36B` |
| Triage Coral | `#EF6F61` |
| Soft Amber | `#D6A84F` |
| Deep Teal | `#0E4F56` |
| Case Blue | `#4967FF` |
| Muted Graphite | `#56616A` |

Fonts: **Fraunces** (display) · **DM Sans** (body/UI) · **JetBrains Mono** (amounts, hashes, IDs)

---

## License

MIT
