# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing


class RemedyCourt(gl.Contract):
    """
    RemedyCourt — Reymedi

    A GenLayer-native service failure compensation court backed by GEN escrow.

    Product purpose:
    Merchants create remedy pools funded in GEN. Claimants submit evidence of
    a service failure and request a remedy amount. GenLayer validators evaluate
    the claim against the pool policy, evidence, merchant response, and
    proportionality. Approved claimants receive GEN. Rejected claims unlock
    reserved funds back to the pool.

    What belongs on-chain:
    - merchant profiles and statuses
    - remedy pool registry and GEN balances
    - claim records and status lifecycle
    - evidence hashes and public URLs
    - merchant and claimant response summaries
    - settlement offers and outcomes
    - GenLayer verdict records
    - payout and withdrawal receipts
    - audit trail

    What stays off-chain:
    - full evidence files, screenshots, PDFs, support transcripts
    - private claim statements beyond what is needed for judgment
    - store those privately and put only hashes or short summaries here
    """

    owner: str
    paused: bool

    pool_counter: u256
    claim_counter: u256
    audit_counter: u256

    # merchant_address_hex -> MerchantProfile JSON
    merchants: TreeMap[str, str]

    # pool_id_str -> RemedyPool JSON
    pools: TreeMap[str, str]
    # merchant_hex -> pipe-separated pool_id list
    merchant_pool_index: TreeMap[str, str]

    # claim_id_str -> Claim JSON
    claims: TreeMap[str, str]
    # pool_id_str -> pipe-separated claim_id list
    pool_claim_index: TreeMap[str, str]
    # claimant_hex -> pipe-separated claim_id list
    claimant_claim_index: TreeMap[str, str]
    # claimant_hex::pool_id_str -> "1" if active claim exists
    active_claim_guard: TreeMap[str, str]

    audit_logs: TreeMap[str, str]

    # platform config
    min_pool_funding: u256
    max_claim_basis_points: u256

    def __init__(self) -> None:
        self.owner = gl.message.sender_address.as_hex
        self.paused = False

        self.pool_counter = u256(0)
        self.claim_counter = u256(0)
        self.audit_counter = u256(0)

        self.merchants = TreeMap()
        self.pools = TreeMap()
        self.merchant_pool_index = TreeMap()

        self.claims = TreeMap()
        self.pool_claim_index = TreeMap()
        self.claimant_claim_index = TreeMap()
        self.active_claim_guard = TreeMap()

        self.audit_logs = TreeMap()

        self.min_pool_funding = u256(0)
        self.max_claim_basis_points = u256(5000)  # 50% default cap

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    def _sender(self) -> str:
        return gl.message.sender_address.as_hex.lower()

    def _json(self, value: typing.Any) -> str:
        return json.dumps(value, sort_keys=True)

    def _load(self, raw: str) -> typing.Any:
        if raw is None or raw == "":
            return {}
        return json.loads(raw)

    def _require_owner(self) -> None:
        if self._sender() != self.owner.lower():
            raise gl.vm.UserError("Only contract owner")

    def _require_not_paused(self) -> None:
        if self.paused:
            raise gl.vm.UserError("Platform is paused")

    def _require_non_empty(self, value: str, field: str) -> None:
        if value is None or len(value.strip()) == 0:
            raise gl.vm.UserError(field + " is required")

    def _append(self, existing: str, item: str) -> str:
        if existing is None or existing == "":
            return item
        return existing + "|" + item

    def _limit(self, value: typing.Any, max_len: int) -> str:
        text = str(value)
        if len(text) > max_len:
            return text[:max_len]
        return text

    def _to_int(self, value: typing.Any, fallback: int = 0) -> int:
        try:
            return int(value)
        except Exception:
            return fallback

    def _bounded_score(self, value: typing.Any, fallback: int = 0) -> int:
        score = self._to_int(value, fallback)
        if score < 0:
            return 0
        if score > 100:
            return 100
        return score

    def _next_pool_id(self) -> str:
        self.pool_counter = self.pool_counter + u256(1)
        return "POOL-" + str(self.pool_counter)

    def _next_claim_id(self) -> str:
        self.claim_counter = self.claim_counter + u256(1)
        return "CLAIM-" + str(self.claim_counter)

    def _next_audit_id(self) -> str:
        self.audit_counter = self.audit_counter + u256(1)
        return "AUDIT-" + str(self.audit_counter)

    def _record_audit(
        self,
        entity_id: str,
        event_type: str,
        actor: str,
        summary: str,
        data_ref: str,
    ) -> str:
        audit_id = self._next_audit_id()
        entry = {
            "audit_id": audit_id,
            "entity_id": entity_id,
            "event_type": event_type,
            "actor": actor.lower(),
            "summary": self._limit(summary, 600),
            "data_ref": self._limit(data_ref, 260),
        }
        self.audit_logs[audit_id] = self._json(entry)
        return audit_id

    def _require_merchant_exists(self, wallet: str) -> typing.Any:
        raw = self.merchants.get(wallet.lower(), "")
        if raw == "":
            raise gl.vm.UserError("Merchant not registered")
        return self._load(raw)

    def _require_pool_exists(self, pool_id: str) -> typing.Any:
        raw = self.pools.get(pool_id, "")
        if raw == "":
            raise gl.vm.UserError("Pool not found: " + pool_id)
        return self._load(raw)

    def _require_claim_exists(self, claim_id: str) -> typing.Any:
        raw = self.claims.get(claim_id, "")
        if raw == "":
            raise gl.vm.UserError("Claim not found: " + claim_id)
        return self._load(raw)

    def _normalise_verdict_code(self, value: typing.Any) -> str:
        v = str(value).strip().upper()
        allowed = [
            "NO_FAILURE",
            "QUALIFYING_FAILURE",
            "PARTIAL_FAILURE",
            "MERCHANT_NOT_RESPONSIBLE",
            "EXCLUDED_BY_POLICY",
            "INSUFFICIENT_EVIDENCE",
            "CLAIMANT_FAULT",
            "DUPLICATE_OR_ABUSIVE",
            "MANUAL_REVIEW",
        ]
        if v in allowed:
            return v
        return "MANUAL_REVIEW"

    def _normalise_payout_band(self, value: typing.Any) -> str:
        b = str(value).strip().upper()
        if b in ["NONE", "SMALL", "PARTIAL", "FULL", "MANUAL"]:
            return b
        return "NONE"

    def _normalise_verdict_result(self, raw: typing.Any) -> typing.Any:
        if isinstance(raw, str):
            parsed = json.loads(raw)
        else:
            parsed = raw

        verdict_code = self._normalise_verdict_code(parsed.get("verdict_code", "MANUAL_REVIEW"))
        payout_band = self._normalise_payout_band(parsed.get("payout_band", "NONE"))

        payout_amount = self._to_int(parsed.get("payout_amount", 0))
        if payout_amount < 0:
            payout_amount = 0

        # Enforce band/amount consistency
        if payout_band == "NONE":
            payout_amount = 0
        if payout_band == "MANUAL":
            payout_amount = 0

        confidence = self._bounded_score(parsed.get("confidence", 50))

        policy_alignment = str(parsed.get("policy_alignment", "unclear")).strip().lower()
        if policy_alignment not in ["covered", "partial", "excluded", "unclear"]:
            policy_alignment = "unclear"

        evidence_strength = str(parsed.get("evidence_strength", "absent")).strip().lower()
        if evidence_strength not in ["strong", "moderate", "weak", "absent"]:
            evidence_strength = "absent"

        merchant_fault = str(parsed.get("merchant_fault", "disputed")).strip().lower()
        if merchant_fault not in ["clear", "likely", "disputed", "unlikely", "none"]:
            merchant_fault = "disputed"

        claimant_impact = str(parsed.get("claimant_impact", "none")).strip().lower()
        if claimant_impact not in ["severe", "material", "minor", "none"]:
            claimant_impact = "none"

        short_reason = self._limit(parsed.get("short_reason", ""), 600)

        return {
            "verdict_code": verdict_code,
            "payout_band": payout_band,
            "payout_amount": payout_amount,
            "confidence": confidence,
            "policy_alignment": policy_alignment,
            "evidence_strength": evidence_strength,
            "merchant_fault": merchant_fault,
            "claimant_impact": claimant_impact,
            "short_reason": short_reason,
        }

    def _run_consensus_verdict(
        self,
        claim: typing.Any,
        pool: typing.Any,
    ) -> typing.Any:
        pool_context = self._json({
            "pool_id": pool.get("pool_id", ""),
            "title": pool.get("title", ""),
            "category": pool.get("category", ""),
            "policy_summary": pool.get("policy_summary", ""),
            "public_policy_url": pool.get("public_policy_url", ""),
            "min_claim_amount": pool.get("min_claim_amount", 0),
            "max_claim_amount": pool.get("max_claim_amount", 0),
        })

        claim_context = self._json({
            "claim_id": claim.get("claim_id", ""),
            "claim_summary": claim.get("claim_summary", ""),
            "public_ref": claim.get("public_ref", ""),
            "requested_amount": claim.get("requested_amount", 0),
            "reserved_amount": claim.get("reserved_amount", 0),
            "public_evidence_url": claim.get("public_evidence_url", ""),
            "private_evidence_hash_present": bool(
                claim.get("private_evidence_hash", "") not in ["", "0x"]
            ),
            "merchant_response_summary": claim.get("merchant_response_summary", "No merchant response provided."),
            "merchant_response_url": claim.get("merchant_response_url", ""),
            "claimant_response_summary": claim.get("claimant_response_summary", "No claimant response provided."),
        })

        def evaluate_once() -> str:
            prompt = f"""
You are an independent adjudicator for Reymedi, a GenLayer-native service failure compensation court.

Your task is to evaluate the service failure claim below and produce a structured canonical verdict.

Important rules:
1. Do not invent facts not present in the claim or evidence.
2. Treat the pool policy as authoritative for what is covered or excluded.
3. Assess whether the merchant response materially changes the picture.
4. A missing merchant response does not automatically prove guilt.
5. If private evidence hash is present, acknowledge it exists but you cannot read the file.
6. A missing evidence URL does not automatically mean INSUFFICIENT_EVIDENCE if hash is present.
7. Assess the proportionality of the requested amount to the described harm.
8. If you cannot reach a clear conclusion, use MANUAL_REVIEW.
9. Return only the JSON object below — no surrounding text.

Pool policy:
{pool_context}

Claim:
{claim_context}

Return this exact JSON object:
{{
  "verdict_code": "NO_FAILURE | QUALIFYING_FAILURE | PARTIAL_FAILURE | MERCHANT_NOT_RESPONSIBLE | EXCLUDED_BY_POLICY | INSUFFICIENT_EVIDENCE | CLAIMANT_FAULT | DUPLICATE_OR_ABUSIVE | MANUAL_REVIEW",
  "payout_band": "NONE | SMALL | PARTIAL | FULL | MANUAL",
  "payout_amount": 0,
  "confidence": 0,
  "policy_alignment": "covered | partial | excluded | unclear",
  "evidence_strength": "strong | moderate | weak | absent",
  "merchant_fault": "clear | likely | disputed | unlikely | none",
  "claimant_impact": "severe | material | minor | none",
  "short_reason": "one sentence explanation"
}}

Rules for payout_amount:
- Must be 0 if payout_band is NONE or MANUAL.
- Must equal requested_amount if payout_band is FULL.
- Must be between 1 and (requested_amount - 1) if payout_band is PARTIAL or SMALL.
- Must never exceed reserved_amount.
- Use the wei values from the claim context.
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            normalised = self._normalise_verdict_result(raw)
            return json.dumps(normalised, sort_keys=True)

        consensus_json = gl.eq_principle.prompt_comparative(
            evaluate_once,
            principle="""
The final Reymedi verdict must be equivalent across validators.

Strict requirements:
- verdict_code must match exactly.
- payout_band must match exactly.
- QUALIFYING_FAILURE or PARTIAL_FAILURE cannot be equivalent to NO_FAILURE, MERCHANT_NOT_RESPONSIBLE, EXCLUDED_BY_POLICY, CLAIMANT_FAULT, or DUPLICATE_OR_ABUSIVE.
- MANUAL_REVIEW must match exactly.
- payout_amount may differ by at most 5% of the reserved_amount.
- confidence, policy_alignment, evidence_strength, merchant_fault, and claimant_impact must materially match.
- short_reason wording may differ if the core finding is the same.
""",
        )

        return self._normalise_verdict_result(consensus_json)

    # -------------------------------------------------------------------------
    # Owner / platform controls
    # -------------------------------------------------------------------------

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner

    @gl.public.view
    def is_paused(self) -> bool:
        return self.paused

    @gl.public.write
    def transfer_ownership(self, new_owner: str) -> None:
        self._require_owner()
        self._require_non_empty(new_owner, "new_owner")
        old = self.owner
        self.owner = new_owner.lower()
        self._record_audit("platform", "OWNERSHIP_TRANSFERRED", old, "Ownership transferred to " + new_owner, new_owner)

    @gl.public.write
    def pause(self) -> None:
        self._require_owner()
        self.paused = True
        self._record_audit("platform", "PLATFORM_PAUSED", self._sender(), "Platform paused", "")

    @gl.public.write
    def unpause(self) -> None:
        self._require_owner()
        self.paused = False
        self._record_audit("platform", "PLATFORM_UNPAUSED", self._sender(), "Platform unpaused", "")

    @gl.public.write
    def set_min_pool_funding(self, amount: u256) -> None:
        self._require_owner()
        self.min_pool_funding = amount
        self._record_audit("platform", "MIN_POOL_FUNDING_SET", self._sender(), "Min pool funding updated", str(amount))

    @gl.public.write
    def set_max_claim_percentage(self, basis_points: u256) -> None:
        self._require_owner()
        if basis_points > u256(10000):
            raise gl.vm.UserError("basis_points must be 0–10000")
        self.max_claim_basis_points = basis_points

    # -------------------------------------------------------------------------
    # Admin alias methods (keep spec-compatible names)
    # -------------------------------------------------------------------------

    @gl.public.write
    def set_admin(self, new_admin: str) -> None:
        self._require_owner()
        self._require_non_empty(new_admin, "new_admin")
        self.owner = new_admin.lower()

    @gl.public.write
    def set_platform_paused(self, paused: bool) -> None:
        self._require_owner()
        if paused:
            self.paused = True
            self._record_audit("platform", "PLATFORM_PAUSED", self._sender(), "Platform paused via set_platform_paused", "")
        else:
            self.paused = False
            self._record_audit("platform", "PLATFORM_UNPAUSED", self._sender(), "Platform unpaused via set_platform_paused", "")

    @gl.public.write
    def approve_merchant(self, merchant: str) -> None:
        self._require_owner()
        self._require_non_empty(merchant, "merchant")
        m = self._require_merchant_exists(merchant)
        m["status"] = "active"
        self.merchants[merchant.lower()] = self._json(m)
        self._record_audit(merchant, "MERCHANT_APPROVED", self._sender(), "Merchant approved", merchant)

    @gl.public.write
    def disable_merchant(self, merchant: str, reason: str) -> None:
        self._require_owner()
        m = self._require_merchant_exists(merchant)
        m["status"] = "disabled"
        m["disable_reason"] = self._limit(reason, 400)
        self.merchants[merchant.lower()] = self._json(m)
        self._record_audit(merchant, "MERCHANT_DISABLED", self._sender(), "Merchant disabled: " + reason, merchant)

    # -------------------------------------------------------------------------
    # Merchant methods
    # -------------------------------------------------------------------------

    @gl.public.write
    def register_merchant(self, display_name: str, public_slug: str) -> None:
        self._require_not_paused()
        self._require_non_empty(display_name, "display_name")
        self._require_non_empty(public_slug, "public_slug")

        sender = self._sender()
        existing = self.merchants.get(sender, "")
        if existing != "":
            raise gl.vm.UserError("Already registered as a merchant")

        record = {
            "owner": sender,
            "display_name": self._limit(display_name, 180),
            "public_slug": self._limit(public_slug, 80),
            "status": "active",  # auto-approved on registration
        }
        self.merchants[sender] = self._json(record)
        self._record_audit(sender, "MERCHANT_REGISTERED", sender, "Merchant registered (auto-approved): " + display_name, public_slug)

    @gl.public.write
    def create_pool(
        self,
        title: str,
        category: str,
        policy_summary: str,
        policy_hash: str,
        public_policy_url: str,
        min_claim_amount: u256,
        max_claim_amount: u256,
        claim_window_seconds: u256,
    ) -> str:
        self._require_not_paused()
        self._require_non_empty(title, "title")
        self._require_non_empty(policy_summary, "policy_summary")

        sender = self._sender()
        m = self._require_merchant_exists(sender)
        if m.get("status", "") != "active":
            raise gl.vm.UserError("Merchant is not active")
        if min_claim_amount > max_claim_amount:
            raise gl.vm.UserError("min_claim_amount must be <= max_claim_amount")

        pool_id = self._next_pool_id()

        record = {
            "pool_id": pool_id,
            "merchant": sender,
            "title": self._limit(title, 220),
            "category": self._limit(category, 140),
            "policy_summary": self._limit(policy_summary, 2000),
            "policy_hash": self._limit(policy_hash, 130),
            "public_policy_url": self._limit(public_policy_url, 600),
            "status": "draft",
            "total_deposited": 0,
            "available_balance": 0,
            "reserved_balance": 0,
            "paid_balance": 0,
            "min_claim_amount": str(min_claim_amount),
            "max_claim_amount": str(max_claim_amount),
            "claim_window_seconds": str(claim_window_seconds),
        }

        self.pools[pool_id] = self._json(record)
        self.merchant_pool_index[sender] = self._append(
            self.merchant_pool_index.get(sender, ""), pool_id
        )
        self._record_audit(pool_id, "POOL_CREATED", sender, "Remedy pool created: " + title, pool_id)
        return pool_id

    @gl.public.write
    def fund_pool(self, pool_id: str, amount: u256) -> None:
        self._require_not_paused()
        self._require_non_empty(pool_id, "pool_id")

        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError("Amount must be greater than zero")

        sender = self._sender()
        pool = self._require_pool_exists(pool_id)

        if pool.get("merchant", "") != sender:
            raise gl.vm.UserError("Only the pool merchant can fund this pool")
        if pool.get("status", "") not in ["draft", "active"]:
            raise gl.vm.UserError("Pool is not fundable in its current status")

        pool["total_deposited"] = self._to_int(pool["total_deposited"]) + amt
        pool["available_balance"] = self._to_int(pool["available_balance"]) + amt

        min_fund = int(self.min_pool_funding)
        if pool["status"] == "draft" and pool["available_balance"] >= min_fund:
            pool["status"] = "active"

        self.pools[pool_id] = self._json(pool)
        self._record_audit(pool_id, "POOL_FUNDED", sender, "Pool funded with " + str(amt) + " wei GEN", pool_id)

    @gl.public.write
    def pause_pool(self, pool_id: str) -> None:
        sender = self._sender()
        pool = self._require_pool_exists(pool_id)

        if pool.get("merchant", "") != sender and sender != self.owner.lower():
            raise gl.vm.UserError("Only pool merchant or platform owner can pause this pool")
        if pool.get("status", "") != "active":
            raise gl.vm.UserError("Pool is not active")

        pool["status"] = "paused"
        self.pools[pool_id] = self._json(pool)
        self._record_audit(pool_id, "POOL_PAUSED", sender, "Pool paused", pool_id)

    @gl.public.write
    def resume_pool(self, pool_id: str) -> None:
        sender = self._sender()
        pool = self._require_pool_exists(pool_id)

        if pool.get("merchant", "") != sender:
            raise gl.vm.UserError("Only pool merchant can resume this pool")
        if pool.get("status", "") != "paused":
            raise gl.vm.UserError("Pool is not paused")

        pool["status"] = "active"
        self.pools[pool_id] = self._json(pool)
        self._record_audit(pool_id, "POOL_RESUMED", sender, "Pool resumed", pool_id)

    @gl.public.write
    def close_pool(self, pool_id: str) -> None:
        sender = self._sender()
        pool = self._require_pool_exists(pool_id)

        if pool.get("merchant", "") != sender:
            raise gl.vm.UserError("Only pool merchant can close this pool")
        if self._to_int(pool.get("reserved_balance", 0)) != 0:
            raise gl.vm.UserError("Cannot close pool with active reserved funds")

        pool["status"] = "closed"
        self.pools[pool_id] = self._json(pool)
        self._record_audit(pool_id, "POOL_CLOSED", sender, "Pool closed", pool_id)

    @gl.public.write
    def withdraw_available(self, pool_id: str, amount: u256) -> None:
        sender = self._sender()
        pool = self._require_pool_exists(pool_id)

        if pool.get("merchant", "") != sender:
            raise gl.vm.UserError("Only pool merchant can withdraw from this pool")

        withdraw_amount = int(amount)
        available = self._to_int(pool.get("available_balance", 0))
        if withdraw_amount > available:
            raise gl.vm.UserError("Insufficient available balance — cannot withdraw reserved GEN")

        pool["available_balance"] = available - withdraw_amount
        pool["total_deposited"] = self._to_int(pool.get("total_deposited", 0)) - withdraw_amount
        self.pools[pool_id] = self._json(pool)

        self._record_audit(pool_id, "POOL_WITHDRAWAL", sender, "Merchant withdrew " + str(withdraw_amount) + " wei GEN", pool_id)
        gl.message.sender_address.transfer(amount)

    @gl.public.write
    def respond_to_claim(
        self,
        claim_id: str,
        response_hash: str,
        response_summary: str,
        public_response_url: str,
    ) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)
        pool = self._require_pool_exists(claim.get("pool_id", ""))

        if pool.get("merchant", "") != sender:
            raise gl.vm.UserError("Only the pool merchant can respond to this claim")
        if claim.get("status", "") != "merchant_response_pending":
            raise gl.vm.UserError("Claim is not awaiting a merchant response")

        claim["merchant_response_hash"] = self._limit(response_hash, 130)
        claim["merchant_response_summary"] = self._limit(response_summary, 1800)
        claim["merchant_response_url"] = self._limit(public_response_url, 600)
        claim["status"] = "ready_for_review"
        self.claims[claim_id] = self._json(claim)
        self._record_audit(claim_id, "MERCHANT_RESPONSE_SUBMITTED", sender, "Merchant responded to claim", claim_id)

    @gl.public.write
    def offer_settlement(self, claim_id: str, amount: u256, reason: str) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)
        pool = self._require_pool_exists(claim.get("pool_id", ""))

        if pool.get("merchant", "") != sender:
            raise gl.vm.UserError("Only the pool merchant can offer a settlement")
        if claim.get("status", "") not in ["merchant_response_pending", "ready_for_review"]:
            raise gl.vm.UserError("Claim is not in a settleable state")

        offer = int(amount)
        if offer > self._to_int(claim.get("reserved_amount", 0)):
            raise gl.vm.UserError("Settlement amount exceeds reserved claim amount")

        claim["settlement_offer_amount"] = offer
        claim["settlement_offer_reason"] = self._limit(reason, 800)
        claim["settlement_pending"] = True
        self.claims[claim_id] = self._json(claim)
        self._record_audit(claim_id, "SETTLEMENT_OFFERED", sender, "Settlement offer: " + str(offer) + " wei GEN", claim_id)

    # -------------------------------------------------------------------------
    # Claimant methods
    # -------------------------------------------------------------------------

    @gl.public.write
    def submit_claim(
        self,
        pool_id: str,
        public_ref: str,
        claim_summary: str,
        requested_amount: u256,
        private_evidence_hash: str,
        public_evidence_url: str,
    ) -> str:
        self._require_not_paused()
        self._require_non_empty(pool_id, "pool_id")
        self._require_non_empty(claim_summary, "claim_summary")

        sender = self._sender()
        pool = self._require_pool_exists(pool_id)

        if pool.get("status", "") != "active":
            raise gl.vm.UserError("Pool is not active")

        req = int(requested_amount)
        min_amt = self._to_int(pool.get("min_claim_amount", 0))
        max_amt = self._to_int(pool.get("max_claim_amount", 0))

        if req < min_amt:
            raise gl.vm.UserError("Requested amount is below pool minimum claim amount")
        if req > max_amt:
            raise gl.vm.UserError("Requested amount exceeds pool maximum claim amount")

        available = self._to_int(pool.get("available_balance", 0))
        max_by_pct = (available * int(self.max_claim_basis_points)) // 10000
        if req > max_by_pct:
            raise gl.vm.UserError("Requested amount exceeds pool percentage cap")
        if req > available:
            raise gl.vm.UserError("Insufficient pool balance for this claim")

        guard_key = sender + "::" + pool_id
        if self.active_claim_guard.get(guard_key, "") == "1":
            raise gl.vm.UserError("You already have an active claim against this pool")
        self.active_claim_guard[guard_key] = "1"

        claim_id = self._next_claim_id()

        record = {
            "claim_id": claim_id,
            "pool_id": pool_id,
            "claimant": sender,
            "public_ref": self._limit(public_ref, 200),
            "claim_summary": self._limit(claim_summary, 2000),
            "requested_amount": req,
            "reserved_amount": req,
            "private_evidence_hash": self._limit(private_evidence_hash, 130),
            "public_evidence_url": self._limit(public_evidence_url, 600),
            "status": "merchant_response_pending",
            "final_payout_amount": 0,
            "verdict_code": None,
            "verdict_summary": None,
            "merchant_response_hash": None,
            "merchant_response_summary": None,
            "merchant_response_url": None,
            "claimant_response_hash": None,
            "claimant_response_summary": None,
            "claimant_response_url": None,
            "settlement_offer_amount": None,
            "settlement_offer_reason": None,
            "settlement_pending": False,
            "resolved_at": None,
            "paid_at": None,
        }

        pool["available_balance"] = available - req
        pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) + req
        self.pools[pool_id] = self._json(pool)

        self.claims[claim_id] = self._json(record)

        self.pool_claim_index[pool_id] = self._append(
            self.pool_claim_index.get(pool_id, ""), claim_id
        )
        self.claimant_claim_index[sender] = self._append(
            self.claimant_claim_index.get(sender, ""), claim_id
        )

        self._record_audit(claim_id, "CLAIM_SUBMITTED", sender, "Claim submitted against pool " + pool_id, claim_id)
        return claim_id

    @gl.public.write
    def accept_settlement(self, claim_id: str) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)

        if claim.get("claimant", "") != sender:
            raise gl.vm.UserError("Only the claimant can accept a settlement")
        if not claim.get("settlement_pending", False):
            raise gl.vm.UserError("No pending settlement offer for this claim")

        offer = self._to_int(claim.get("settlement_offer_amount", 0))
        reserved = self._to_int(claim.get("reserved_amount", 0))

        pool = self._require_pool_exists(claim.get("pool_id", ""))
        release = reserved - offer
        if release > 0:
            pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) - release
            pool["available_balance"] = self._to_int(pool.get("available_balance", 0)) + release
        pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) - offer
        pool["paid_balance"] = self._to_int(pool.get("paid_balance", 0)) + offer
        self.pools[claim.get("pool_id", "")] = self._json(pool)

        claim["final_payout_amount"] = offer
        claim["reserved_amount"] = offer
        claim["verdict_code"] = "QUALIFYING_FAILURE"
        claim["verdict_summary"] = "Settlement accepted by claimant."
        claim["status"] = "approved"
        claim["settlement_pending"] = False
        self.claims[claim_id] = self._json(claim)
        self._record_audit(claim_id, "SETTLEMENT_ACCEPTED", sender, "Claimant accepted settlement of " + str(offer) + " wei GEN", claim_id)

    @gl.public.write
    def reject_settlement(self, claim_id: str) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)

        if claim.get("claimant", "") != sender:
            raise gl.vm.UserError("Only the claimant can reject a settlement")
        if not claim.get("settlement_pending", False):
            raise gl.vm.UserError("No pending settlement offer for this claim")

        claim["settlement_pending"] = False
        claim["status"] = "ready_for_review"
        self.claims[claim_id] = self._json(claim)
        self._record_audit(claim_id, "SETTLEMENT_REJECTED", sender, "Claimant rejected settlement, forwarding to GenLayer review", claim_id)

    @gl.public.write
    def add_claimant_response(
        self,
        claim_id: str,
        response_hash: str,
        response_summary: str,
        public_response_url: str,
    ) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)

        if claim.get("claimant", "") != sender:
            raise gl.vm.UserError("Only the claimant can add a claimant response")
        if claim.get("status", "") not in ["merchant_response_pending", "ready_for_review"]:
            raise gl.vm.UserError("Claim is not in a state that accepts a claimant response")

        claim["claimant_response_hash"] = self._limit(response_hash, 130)
        claim["claimant_response_summary"] = self._limit(response_summary, 1400)
        claim["claimant_response_url"] = self._limit(public_response_url, 600)
        self.claims[claim_id] = self._json(claim)
        self._record_audit(claim_id, "CLAIMANT_RESPONSE_ADDED", sender, "Claimant added response", claim_id)

    @gl.public.write
    def request_review(self, claim_id: str) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)

        if claim.get("claimant", "") != sender:
            raise gl.vm.UserError("Only the claimant can request a GenLayer review")
        if claim.get("status", "") not in ["merchant_response_pending", "ready_for_review"]:
            raise gl.vm.UserError("Claim is not in a reviewable state")

        claim["status"] = "ready_for_review"
        self.claims[claim_id] = self._json(claim)
        self._record_audit(claim_id, "REVIEW_REQUESTED", sender, "Claimant requested GenLayer review", claim_id)

    @gl.public.write
    def claim_payout(self, claim_id: str) -> None:
        sender = self._sender()
        claim = self._require_claim_exists(claim_id)

        if claim.get("claimant", "") != sender:
            raise gl.vm.UserError("Only the claimant can claim this payout")
        if claim.get("status", "") not in ["approved", "partially_approved"]:
            raise gl.vm.UserError("Claim is not approved for payout")
        if claim.get("paid_at") is not None:
            raise gl.vm.UserError("Payout already claimed")

        amount = self._to_int(claim.get("final_payout_amount", 0))
        if amount <= 0:
            raise gl.vm.UserError("No approved payout amount for this claim")

        pool = self._require_pool_exists(claim.get("pool_id", ""))
        pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) - amount
        pool["paid_balance"] = self._to_int(pool.get("paid_balance", 0)) + amount
        self.pools[claim.get("pool_id", "")] = self._json(pool)

        claim["status"] = "paid"
        claim["paid_at"] = "paid"
        self.claims[claim_id] = self._json(claim)

        guard_key = sender + "::" + claim.get("pool_id", "")
        self.active_claim_guard[guard_key] = "0"

        self._record_audit(claim_id, "PAYOUT_CLAIMED", sender, "Claimant claimed payout of " + str(amount) + " wei GEN", claim_id)
        gl.message.sender_address.transfer(u256(amount))

    # -------------------------------------------------------------------------
    # GenLayer non-deterministic judgment
    # -------------------------------------------------------------------------

    @gl.public.write
    def resolve_claim(self, claim_id: str) -> None:
        """
        Primary GenLayer non-deterministic judgment method.

        Uses gl.nondet.exec_prompt to have validators evaluate the claim against
        pool policy, evidence, and responses. Uses gl.eq_principle.prompt_comparative
        for consensus on the canonical verdict.
        """
        claim = self._require_claim_exists(claim_id)

        if claim.get("status", "") not in ["ready_for_review", "reviewing"]:
            raise gl.vm.UserError("Claim is not in a reviewable state")

        claim["status"] = "reviewing"
        self.claims[claim_id] = self._json(claim)

        pool = self._require_pool_exists(claim.get("pool_id", ""))
        verdict = self._run_consensus_verdict(claim, pool)

        verdict_code = verdict["verdict_code"]
        payout_amount = verdict["payout_amount"]
        payout_band = verdict["payout_band"]

        reserved = self._to_int(claim.get("reserved_amount", 0))
        payout_amount = max(0, min(payout_amount, reserved))

        approved_codes = {"QUALIFYING_FAILURE", "PARTIAL_FAILURE"}
        rejected_codes = {
            "NO_FAILURE",
            "MERCHANT_NOT_RESPONSIBLE",
            "EXCLUDED_BY_POLICY",
            "CLAIMANT_FAULT",
            "DUPLICATE_OR_ABUSIVE",
        }
        unverifiable_codes = {"INSUFFICIENT_EVIDENCE"}

        if verdict_code in approved_codes and payout_amount > 0:
            if payout_band == "FULL":
                claim["status"] = "approved"
            else:
                claim["status"] = "partially_approved"
            claim["final_payout_amount"] = payout_amount

            over = reserved - payout_amount
            if over > 0:
                pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) - over
                pool["available_balance"] = self._to_int(pool.get("available_balance", 0)) + over

        elif verdict_code in rejected_codes:
            claim["status"] = "rejected"
            claim["final_payout_amount"] = 0
            pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) - reserved
            pool["available_balance"] = self._to_int(pool.get("available_balance", 0)) + reserved
            guard_key = claim.get("claimant", "") + "::" + claim.get("pool_id", "")
            self.active_claim_guard[guard_key] = "0"

        elif verdict_code in unverifiable_codes:
            claim["status"] = "unverifiable"
            claim["final_payout_amount"] = 0
            pool["reserved_balance"] = self._to_int(pool.get("reserved_balance", 0)) - reserved
            pool["available_balance"] = self._to_int(pool.get("available_balance", 0)) + reserved

        else:  # MANUAL_REVIEW
            claim["status"] = "manual_review"
            claim["final_payout_amount"] = 0
            # Funds remain reserved

        claim["verdict_code"] = verdict_code
        claim["verdict_summary"] = verdict.get("short_reason", "")
        claim["resolved_at"] = "resolved"

        self.pools[claim.get("pool_id", "")] = self._json(pool)
        self.claims[claim_id] = self._json(claim)

        self._record_audit(
            claim_id,
            "GENLAYER_VERDICT_ISSUED",
            "GENLAYER_CONSENSUS",
            "Consensus verdict: " + verdict_code + " — " + verdict.get("short_reason", ""),
            claim_id,
        )

    # -------------------------------------------------------------------------
    # View methods
    # -------------------------------------------------------------------------

    @gl.public.view
    def get_pool(self, pool_id: str) -> str:
        return self.pools.get(pool_id, "")

    @gl.public.view
    def get_claim_public(self, claim_id: str) -> str:
        raw = self.claims.get(claim_id, "")
        if raw == "":
            return ""
        claim = self._load(raw)
        public = {
            "claim_id": claim.get("claim_id"),
            "pool_id": claim.get("pool_id"),
            "status": claim.get("status"),
            "verdict_code": claim.get("verdict_code"),
            "verdict_summary": claim.get("verdict_summary"),
            "final_payout_amount": claim.get("final_payout_amount"),
            "resolved_at": claim.get("resolved_at"),
        }
        return self._json(public)

    @gl.public.view
    def get_claim_private(self, claim_id: str, viewer: str) -> str:
        raw = self.claims.get(claim_id, "")
        if raw == "":
            raise gl.vm.UserError("Claim not found")
        claim = self._load(raw)

        viewer_low = viewer.lower()
        claimant = claim.get("claimant", "")
        pool = self._require_pool_exists(claim.get("pool_id", ""))
        merchant = pool.get("merchant", "")

        if viewer_low not in [claimant, merchant, self.owner.lower()]:
            raise gl.vm.UserError("Not authorised to view this claim")

        return self._json(claim)

    @gl.public.view
    def get_merchant_pools(self, merchant: str) -> str:
        index = self.merchant_pool_index.get(merchant.lower(), "")
        if index == "":
            return "[]"
        pool_ids = index.split("|")
        result = []
        for pool_id in pool_ids:
            raw = self.pools.get(pool_id, "")
            if raw != "":
                result.append(self._load(raw))
        return self._json(result)

    @gl.public.view
    def get_claimant_claims(self, claimant: str) -> str:
        index = self.claimant_claim_index.get(claimant.lower(), "")
        if index == "":
            return "[]"
        claim_ids = index.split("|")
        result = []
        for claim_id in claim_ids:
            raw = self.claims.get(claim_id, "")
            if raw != "":
                result.append(self._load(raw))
        return self._json(result)

    @gl.public.view
    def get_pool_claims_for_merchant(self, pool_id: str) -> str:
        # No sender auth here — gen_call view invocations have no real sender.
        # Access control is enforced at the write level; any caller can read claim IDs.
        raw_pool = self.pools.get(pool_id, "")
        if raw_pool == "":
            return "[]"

        index = self.pool_claim_index.get(pool_id, "")
        if index == "":
            return "[]"
        claim_ids = index.split("|")
        result = []
        for claim_id in claim_ids:
            raw = self.claims.get(claim_id, "")
            if raw != "":
                result.append(self._load(raw))
        return self._json(result)

    @gl.public.view
    def get_all_pools_public(self) -> str:
        result = []
        count = int(self.pool_counter)
        for i in range(1, count + 1):
            pool_id = "POOL-" + str(i)
            raw = self.pools.get(pool_id, "")
            if raw == "":
                continue
            pool = self._load(raw)
            if pool.get("status", "") in ["active", "paused"]:
                result.append({
                    "pool_id": pool.get("pool_id"),
                    "title": pool.get("title"),
                    "category": pool.get("category"),
                    "policy_summary": pool.get("policy_summary"),
                    "public_policy_url": pool.get("public_policy_url"),
                    "status": pool.get("status"),
                    "total_deposited": pool.get("total_deposited"),
                    "available_balance": pool.get("available_balance"),
                    "paid_balance": pool.get("paid_balance"),
                    "min_claim_amount": pool.get("min_claim_amount"),
                    "max_claim_amount": pool.get("max_claim_amount"),
                })
        return self._json(result)

    @gl.public.view
    def get_merchant_profile(self, merchant: str) -> str:
        raw = self.merchants.get(merchant.lower(), "")
        if raw == "":
            return ""
        m = self._load(raw)
        return self._json({
            "display_name": m.get("display_name"),
            "public_slug": m.get("public_slug"),
            "status": m.get("status"),
        })

    @gl.public.view
    def get_public_stats(self) -> str:
        total_pools = int(self.pool_counter)
        total_claims = int(self.claim_counter)
        total_paid = 0
        active_pools = 0

        for i in range(1, total_pools + 1):
            raw = self.pools.get("POOL-" + str(i), "")
            if raw == "":
                continue
            pool = self._load(raw)
            total_paid += self._to_int(pool.get("paid_balance", 0))
            if pool.get("status", "") == "active":
                active_pools += 1

        return self._json({
            "total_pools": total_pools,
            "active_pools": active_pools,
            "total_claims": total_claims,
            "total_paid_wei": total_paid,
            "platform_paused": self.paused,
        })

    @gl.public.view
    def get_audit_log(self, audit_id: str) -> str:
        return self.audit_logs.get(audit_id, "")

    @gl.public.view
    def get_contract_summary(self) -> str:
        return self._json({
            "owner": self.owner,
            "paused": self.paused,
            "pool_counter": str(self.pool_counter),
            "claim_counter": str(self.claim_counter),
            "audit_counter": str(self.audit_counter),
            "min_pool_funding": str(self.min_pool_funding),
            "max_claim_basis_points": str(self.max_claim_basis_points),
        })
