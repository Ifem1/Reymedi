"use client";

import { useEffect, useState, useCallback } from "react";
import { ClinicShell } from "@/components/ClinicShell";
import { RemedyPoolCard } from "@/components/RemedyPoolCard";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  getMerchantPools, getMerchantProfile, registerMerchant, createPool,
  RemedyPool, weiFromGEN,
} from "@/lib/contract";
import { Loader, Plus, Store } from "lucide-react";

export default function MerchantPage() {
  const { address, connected } = useWallet();
  const [pools, setPools] = useState<RemedyPool[]>([]);
  const [profile, setProfile] = useState<{ display_name: string; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Register form
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");

  // Create pool form
  const [poolTitle, setPoolTitle] = useState("");
  const [poolCategory, setPoolCategory] = useState("");
  const [poolPolicy, setPoolPolicy] = useState("");
  const [poolPolicyHash, setPoolPolicyHash] = useState("");
  const [poolPolicyUrl, setPoolPolicyUrl] = useState("");
  const [poolMin, setPoolMin] = useState("");
  const [poolMax, setPoolMax] = useState("");
  const [poolWindow] = useState("2592000");

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [p, prof] = await Promise.all([getMerchantPools(address), getMerchantProfile(address)]);
      setPools(p);
      setProfile(prof);
      if (prof?.status === "active") setOptimisticActive(false); // real data came in
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await registerMerchant(address, displayName, slug);
      setShowRegister(false);
      // Optimistically unlock the UI — chain confirmation takes a moment
      setOptimisticActive(true);
      setFeedback("Registered successfully. You can now create remedy pools.");
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? "Failed to register.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await createPool(
        address, poolTitle, poolCategory, poolPolicy,
        poolPolicyHash || "0x", poolPolicyUrl,
        weiFromGEN(poolMin), weiFromGEN(poolMax), BigInt(parseInt(poolWindow))
      );
      setShowCreate(false);
      setPoolTitle(""); setPoolCategory(""); setPoolPolicy("");
      setPoolPolicyHash(""); setPoolPolicyUrl(""); setPoolMin(""); setPoolMax("");
      setFeedback("Pool created! Waiting for GenLayer to finalize — refreshing…");
      // Poll until the new pool appears (consensus takes a few seconds)
      let attempts = 0;
      const poll = async () => {
        try {
          const p = await getMerchantPools(address);
          setPools(p);
          if (p.length > pools.length || attempts > 8) {
            setFeedback("Pool created. Fund it from the pool page to activate.");
            return;
          }
        } catch { /* ignore read errors during polling */ }
        attempts++;
        setTimeout(poll, 3000);
      };
      setTimeout(poll, 4000);
    } catch (e: unknown) {
      setFeedback((e as Error).message ?? "Failed to create pool.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ClinicShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>
              MERCHANT ROOM
            </div>
            <h1 className="font-display text-4xl font-semibold">
              {profile?.display_name ?? "Your remedy pools"}
            </h1>
            {profile && (
              <span className="text-xs px-2 py-0.5 rounded-full mt-2 inline-block"
                style={{
                  background: profile.status === "active" ? "var(--pale-mint)" : "#FEF3C7",
                  color: profile.status === "active" ? "var(--remedy-green)" : "#92400E",
                }}>
                {profile.status}
              </span>
            )}
          </div>

          {connected && profile?.status === "active" && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
              <Plus size={14} />
              New remedy pool
            </button>
          )}
        </div>

        {!connected && (
          <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Store size={32} className="mx-auto mb-4" style={{ color: "var(--muted-graphite)" }} />
            <p className="font-display font-semibold mb-1">Connect your wallet</p>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              The merchant room is private to your connected wallet.
            </p>
          </div>
        )}

        {connected && !profile && !loading && (
          <div className="rounded-2xl border p-12 text-center space-y-4"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="font-display font-semibold">Not registered as a merchant</p>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Register your merchant profile to create remedy pools.
            </p>
            <button
              onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
              Register as merchant
            </button>
          </div>
        )}

        {/* Register form */}
        {showRegister && (
          <form onSubmit={handleRegister} className="rounded-2xl border p-6 mb-6 space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="font-display font-semibold text-lg">Register merchant profile</h2>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Merchant display name"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="public-slug"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none font-mono"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }}
            />
            <button type="submit" disabled={actionLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
              {actionLoading ? "Submitting…" : "Submit registration"}
            </button>
          </form>
        )}

        {/* Create pool form */}
        {showCreate && (
          <form onSubmit={handleCreatePool} className="rounded-2xl border p-6 mb-6 space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="font-display font-semibold text-lg">Create a remedy pool</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input value={poolTitle} onChange={(e) => setPoolTitle(e.target.value)} required
                placeholder="Pool title" className="rounded-lg px-4 py-3 text-sm border outline-none"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }} />
              <input value={poolCategory} onChange={(e) => setPoolCategory(e.target.value)} required
                placeholder="Category (e.g. SaaS, Logistics)"
                className="rounded-lg px-4 py-3 text-sm border outline-none"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }} />
            </div>
            <textarea value={poolPolicy} onChange={(e) => setPoolPolicy(e.target.value)} required
              rows={3} placeholder="Policy summary — what service failures are covered?"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }} />
            <input value={poolPolicyUrl} onChange={(e) => setPoolPolicyUrl(e.target.value)}
              placeholder="Full policy URL (optional)"
              className="w-full rounded-lg px-4 py-3 text-sm border outline-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }} />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <input type="number" value={poolMin} onChange={(e) => setPoolMin(e.target.value)} required
                  placeholder="Min claim (GEN)" step="0.0001" min="0"
                  className="w-full rounded-lg px-4 py-3 pr-14 text-sm border outline-none font-mono"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                  style={{ color: "var(--muted-graphite)" }}>GEN</span>
              </div>
              <div className="relative">
                <input type="number" value={poolMax} onChange={(e) => setPoolMax(e.target.value)} required
                  placeholder="Max claim (GEN)" step="0.0001" min="0"
                  className="w-full rounded-lg px-4 py-3 pr-14 text-sm border outline-none font-mono"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--sterile-ink)" }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                  style={{ color: "var(--muted-graphite)" }}>GEN</span>
              </div>
            </div>
            <button type="submit" disabled={actionLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
              {actionLoading ? "Creating…" : "Create pool"}
            </button>
          </form>
        )}

        {feedback && (
          <p className="text-sm mb-6" style={{ color: "var(--remedy-green)" }}>{feedback}</p>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-8" style={{ color: "var(--muted-graphite)" }}>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm">Loading your pools…</span>
          </div>
        )}

        {!loading && pools.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => (
              <RemedyPoolCard
                key={pool.pool_id}
                pool={pool}
                href={`/merchant/pool/${pool.pool_id}`}
              />
            ))}
          </div>
        )}

        {!loading && connected && profile?.status === "active" && pools.length === 0 && (
          <div className="rounded-2xl border p-12 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <p className="font-display font-semibold mb-1">Your remedy pool is ready to be created.</p>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Create your first pool and fund it to start accepting claims.
            </p>
          </div>
        )}
      </div>
    </ClinicShell>
  );
}
