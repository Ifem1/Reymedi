# Reymedi

**A GenLayer-native service failure compensation court.**

Merchants escrow GEN into remedy pools. Claimants submit evidence of service failures. GenLayer validators judge the fair remedy. Approved claimants receive GEN — on-chain, no intermediary.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Contract | GenLayer Intelligent Contract (Python) |
| Network | StudioNet (Chain ID 61999) |
| SDK | GenLayer JS SDK |
| Wallet | Injected wallet (MetaMask / compatible) |
| Query | TanStack Query |

---

## Contract: RemedyCourt

Located at `contract/RemedyCourt.py`.

The contract is a GenLayer Intelligent Contract written in Python. It manages remedy pools, claim lifecycle, GEN escrow, and AI-powered verdict resolution.

### Key methods

| Method | Role | Description |
|--------|------|-------------|
| `register_merchant` | Merchant | Register merchant profile |
| `create_pool` | Merchant | Create a new remedy pool |
| `fund_pool` | Merchant | Payable — deposit GEN into a pool |
| `submit_claim` | Claimant | Open a case against a pool |
| `respond_to_claim` | Merchant | Submit merchant rebuttal |
| `offer_settlement` | Merchant | Offer a settlement GEN amount |
| `accept_settlement` | Claimant | Accept merchant settlement |
| `reject_settlement` | Claimant | Reject settlement, request AI review |
| `request_review` | Claimant | Forward case to GenLayer validators |
| `resolve_claim` | Any | Trigger GenLayer non-deterministic judgment |
| `claim_payout` | Claimant | Claim approved GEN remedy |
| `withdraw_available` | Merchant | Withdraw only unreserved pool GEN |
| `approve_merchant` | Admin | Approve merchant registration |
| `set_platform_paused` | Admin | Emergency pause |

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

## Deploying the contract

1. Install the GenLayer CLI:
   ```bash
   npm install -g @genlayer/cli
   # or
   pip install genlayer-cli
   ```

2. Deploy to StudioNet:
   ```bash
   genlayer deploy contract/RemedyCourt.py --network studionet
   ```

3. Copy the deployed contract address into `.env.local`:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
   ```

---

## Running the frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## StudioNet configuration

```
Network:    StudioNet
Chain ID:   61999
RPC URL:    https://studio.genlayer.com/api
Explorer:   https://explorer-studio.genlayer.com
Currency:   GEN
```

Add StudioNet to MetaMask manually using these details, or the app will prompt you to add it automatically on wallet connect.

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
| Pool name, policy summary, funded amount, paid amount | Public |
| Anonymised verdict count, final verdict category | Public |
| Full claim statement, private evidence | Claimant only |
| Merchant response drafts, funding controls | Merchant only |
| Complete claim packet, evidence URLs | Claimant + Merchant + Validators |
| Abuse logs, platform risk signals | Admin only |

Private evidence is never stored on-chain. Store sensitive files off-chain and submit only the keccak256 hash.

---

## Testing

Run contract tests:
```bash
genlayer test contract/tests/test_remedy_court.py
```

### Test coverage

- [x] Merchant registration
- [x] Admin merchant approval
- [x] Admin merchant disable
- [x] Pool creation
- [x] Pool funding and activation
- [x] Pool funding accumulation
- [x] Claim submission with fund reservation
- [x] Claim below minimum amount rejected
- [x] Claim above maximum amount rejected
- [x] Duplicate active claim rejected
- [x] Merchant response submission
- [x] Wrong wallet cannot respond as merchant
- [x] Settlement offer and acceptance
- [x] Approved claimant can claim payout
- [x] Double payout rejected
- [x] Merchant withdrawal of available funds
- [x] Merchant cannot withdraw reserved funds
- [x] Non-admin cannot pause platform
- [x] Paused platform blocks new claims
- [x] Paused pool blocks new claims

### Frontend QA checklist

- [ ] Public pages do not expose claimant identity or private claim details
- [ ] `/me` shows only claims for connected wallet
- [ ] `/merchant` shows only pools for connected merchant wallet
- [ ] `/admin` shows platform controls (admin wallet only)
- [ ] GEN amounts update after fund/claim/payout transactions
- [ ] Wrong wallet cannot respond to a claim as merchant
- [ ] Payout button appears only after claim is approved
- [ ] Merchant withdraw only processes unreserved GEN
- [ ] `/proof/[claimId]` is anonymised by default
- [ ] Wrong network shows warning banner

---

## Critical invariants

These must never be violated:

1. Claims cannot be approved without funded GEN in the pool.
2. Merchant cannot withdraw GEN reserved for active claims.
3. Claimant cannot claim payout twice for the same claim.
4. Public pages never expose claimant identity or private evidence.
5. Only the pool merchant can respond to claims on that pool.
6. Only the pool merchant or admin can pause a pool.
7. Verdict payload stays minimal for validator equivalence.
8. All GEN movement is real on-chain transfer — no simulated payouts.

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
| Pale Mint | `#DDF4EA` |
| Private Plum | `#5D3B66` |

Fonts: **Fraunces** (display) · **DM Sans** (body/UI) · **JetBrains Mono** (amounts, hashes, IDs)
