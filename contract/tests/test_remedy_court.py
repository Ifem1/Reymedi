"""
Reymedi — RemedyCourt direct tests
Run with: genlayer test
"""

import pytest
from genlayer.testing import ContractRunner

ADMIN = "0xADMIN000000000000000000000000000000000001"
MERCHANT = "0xMERCHANT0000000000000000000000000000001"
CLAIMANT = "0xCLAIMANT000000000000000000000000000001"
OTHER = "0xOTHER00000000000000000000000000000000001"

ONE_GEN = 10 ** 18
FIVE_GEN = 5 * ONE_GEN
TEN_GEN = 10 * ONE_GEN


@pytest.fixture
def runner():
    return ContractRunner("RemedyCourt.py", sender=ADMIN)


def setup_active_merchant(runner):
    runner.set_sender(MERCHANT)
    runner.call("register_merchant", "Test Merchant", "test-merchant")
    runner.set_sender(ADMIN)
    runner.call("approve_merchant", MERCHANT)


def create_funded_pool(runner) -> int:
    runner.set_sender(MERCHANT)
    pool_id = runner.call(
        "create_pool",
        "Delivery Guarantee", "Logistics",
        "Full refund for failed deliveries within 48 hours.",
        "0xpolicyhash", "https://example.com/policy",
        ONE_GEN, FIVE_GEN, 2592000,
    )
    runner.call("fund_pool", pool_id, value=TEN_GEN)
    return pool_id


# ─── Merchant registration ────────────────────────────────────────────────────

def test_register_merchant(runner):
    runner.set_sender(MERCHANT)
    runner.call("register_merchant", "Test Merchant", "test-merchant")
    profile = runner.view("get_merchant_profile", MERCHANT)
    assert profile["status"] == "pending"


def test_approve_merchant(runner):
    runner.set_sender(MERCHANT)
    runner.call("register_merchant", "Test Merchant", "test-merchant")
    runner.set_sender(ADMIN)
    runner.call("approve_merchant", MERCHANT)
    profile = runner.view("get_merchant_profile", MERCHANT)
    assert profile["status"] == "active"


def test_disable_merchant(runner):
    setup_active_merchant(runner)
    runner.set_sender(ADMIN)
    runner.call("disable_merchant", MERCHANT, "Abusive pattern")
    profile = runner.view("get_merchant_profile", MERCHANT)
    assert profile["status"] == "disabled"


# ─── Pool creation and funding ────────────────────────────────────────────────

def test_create_pool(runner):
    setup_active_merchant(runner)
    runner.set_sender(MERCHANT)
    pool_id = runner.call(
        "create_pool",
        "SaaS Uptime Guarantee", "SaaS",
        "We refund if uptime drops below 99.9%.",
        "0xhash", "https://example.com",
        ONE_GEN, FIVE_GEN, 2592000,
    )
    assert pool_id == 1
    pool = runner.view("get_pool", 1)
    assert pool["status"] == "draft"
    assert pool["title"] == "SaaS Uptime Guarantee"


def test_fund_pool_activates_it(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    pool = runner.view("get_pool", pool_id)
    assert pool["status"] == "active"
    assert pool["available_balance"] == TEN_GEN


def test_fund_pool_accumulates(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(MERCHANT)
    runner.call("fund_pool", pool_id, value=FIVE_GEN)
    pool = runner.view("get_pool", pool_id)
    assert pool["available_balance"] == TEN_GEN + FIVE_GEN


# ─── Claim submission ─────────────────────────────────────────────────────────

def test_submit_claim_reserves_funds(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)

    runner.set_sender(CLAIMANT)
    runner.call(
        "submit_claim", pool_id,
        "REF-001", "Package arrived 5 days late.",
        ONE_GEN, "0xevidencehash", "https://example.com/ev",
    )
    pool = runner.view("get_pool", pool_id)
    assert pool["reserved_balance"] == ONE_GEN
    assert pool["available_balance"] == TEN_GEN - ONE_GEN


def test_claim_below_min_rejected(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    with pytest.raises(Exception, match="BELOW_MIN_CLAIM"):
        runner.call("submit_claim", pool_id, "REF-002", "Test.", 100, "0x", "")


def test_claim_above_max_rejected(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    with pytest.raises(Exception, match="ABOVE_MAX_CLAIM"):
        runner.call("submit_claim", pool_id, "REF-003", "Test.", FIVE_GEN + 1, "0x", "")


def test_duplicate_claim_rejected(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-004", "First claim.", ONE_GEN, "0x", "")
    with pytest.raises(Exception, match="DUPLICATE_ACTIVE_CLAIM"):
        runner.call("submit_claim", pool_id, "REF-005", "Second claim.", ONE_GEN, "0x", "")


# ─── Merchant response ────────────────────────────────────────────────────────

def test_merchant_can_respond(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-001", "Claim summary.", ONE_GEN, "0x", "")

    runner.set_sender(MERCHANT)
    runner.call("respond_to_claim", 1, "0xresphash", "We dispute this claim.", "")
    claim = runner.view("get_claim_private", 1, MERCHANT)
    assert claim["status"] == "ready_for_review"


def test_wrong_merchant_cannot_respond(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-001", "Claim.", ONE_GEN, "0x", "")
    runner.set_sender(OTHER)
    with pytest.raises(Exception, match="NOT_POOL_MERCHANT"):
        runner.call("respond_to_claim", 1, "0x", "Fake response.", "")


# ─── Settlement ───────────────────────────────────────────────────────────────

def test_settlement_offer_and_accept(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-001", "Claim.", ONE_GEN, "0x", "")
    runner.set_sender(MERCHANT)
    runner.call("respond_to_claim", 1, "0x", "We offer a partial remedy.", "")
    runner.call("offer_settlement", 1, ONE_GEN // 2, "Goodwill gesture")
    runner.set_sender(CLAIMANT)
    runner.call("accept_settlement", 1)
    claim = runner.view("get_claim_private", 1, CLAIMANT)
    assert claim["status"] == "approved"
    assert claim["final_payout_amount"] == ONE_GEN // 2


# ─── Payout ───────────────────────────────────────────────────────────────────

def test_approved_claimant_can_claim(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-001", "Claim.", ONE_GEN, "0x", "")
    runner.set_sender(MERCHANT)
    runner.call("respond_to_claim", 1, "0x", "Offer.", "")
    runner.call("offer_settlement", 1, ONE_GEN // 2, "Offer")
    runner.set_sender(CLAIMANT)
    runner.call("accept_settlement", 1)
    runner.call("claim_payout", 1)
    claim = runner.view("get_claim_private", 1, CLAIMANT)
    assert claim["status"] == "paid"
    assert claim["paid_at"] is not None


def test_double_payout_rejected(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-001", "Claim.", ONE_GEN, "0x", "")
    runner.set_sender(MERCHANT)
    runner.call("respond_to_claim", 1, "0x", "Offer.", "")
    runner.call("offer_settlement", 1, ONE_GEN // 2, "Offer")
    runner.set_sender(CLAIMANT)
    runner.call("accept_settlement", 1)
    runner.call("claim_payout", 1)
    with pytest.raises(Exception, match="ALREADY_PAID"):
        runner.call("claim_payout", 1)


# ─── Merchant withdrawal ──────────────────────────────────────────────────────

def test_merchant_can_withdraw_available(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(MERCHANT)
    runner.call("withdraw_available", pool_id, FIVE_GEN)
    pool = runner.view("get_pool", pool_id)
    assert pool["available_balance"] == TEN_GEN - FIVE_GEN


def test_merchant_cannot_withdraw_reserved(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(CLAIMANT)
    runner.call("submit_claim", pool_id, "REF-001", "Claim.", FIVE_GEN, "0x", "")
    runner.set_sender(MERCHANT)
    # Only TEN_GEN - FIVE_GEN = FIVE_GEN available
    with pytest.raises(Exception, match="INSUFFICIENT_AVAILABLE_BALANCE"):
        runner.call("withdraw_available", pool_id, TEN_GEN)


# ─── Access control ───────────────────────────────────────────────────────────

def test_non_admin_cannot_pause_platform(runner):
    runner.set_sender(OTHER)
    with pytest.raises(Exception, match="NOT_ADMIN"):
        runner.call("set_platform_paused", True)


def test_paused_platform_blocks_claims(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(ADMIN)
    runner.call("set_platform_paused", True)
    runner.set_sender(CLAIMANT)
    with pytest.raises(Exception, match="PLATFORM_PAUSED"):
        runner.call("submit_claim", pool_id, "REF-001", "Claim.", ONE_GEN, "0x", "")


def test_paused_pool_blocks_claims(runner):
    setup_active_merchant(runner)
    pool_id = create_funded_pool(runner)
    runner.set_sender(MERCHANT)
    runner.call("pause_pool", pool_id)
    runner.set_sender(CLAIMANT)
    with pytest.raises(Exception, match="POOL_NOT_ACTIVE"):
        runner.call("submit_claim", pool_id, "REF-001", "Claim.", ONE_GEN, "0x", "")
