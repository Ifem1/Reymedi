"use client";

import Link from "next/link";
import { ClinicShell } from "@/components/ClinicShell";
import { useWallet } from "@/lib/hooks/useWallet";
import { ArrowRight, Shield, FlaskConical, Gavel, Coins } from "lucide-react";

const STAGES = [
  {
    icon: Shield,
    title: "Intake Bay",
    description: "Merchants create remedy pools backed by escrowed GEN. Claimants open a case with evidence.",
  },
  {
    icon: FlaskConical,
    title: "Evidence Lab",
    description: "All evidence is tagged with visibility labels. Private material stays in the case room.",
  },
  {
    icon: Gavel,
    title: "Remedy Board",
    description: "GenLayer validators read the full case packet and issue a canonical diagnosis.",
  },
  {
    icon: Coins,
    title: "Payout Theatre",
    description: "Approved claimants receive GEN directly. Rejected claims unlock reserved funds.",
  },
];

export default function HomePage() {
  const { connect, connected } = useWallet();

  return (
    <ClinicShell>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full mb-6"
            style={{ background: "var(--pale-mint)", color: "var(--deep-teal)" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block animate-escrow-pulse"
              style={{ background: "var(--remedy-green)" }} />
            Running on StudioNet · GenLayer
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-none tracking-tight mb-6"
            style={{ color: "var(--sterile-ink)" }}>
            The compensation<br />
            <span style={{ color: "var(--remedy-green)" }}>court</span> for<br />
            broken promises.
          </h1>

          <p className="text-lg mb-10 max-w-xl" style={{ color: "var(--muted-graphite)" }}>
            Merchants escrow GEN into remedy pools. You submit evidence of a service failure.
            GenLayer validators judge the fair remedy. Approved cases receive GEN — on-chain, no intermediary.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/pools"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
              Browse remedy pools
              <ArrowRight size={16} />
            </Link>

            {!connected && (
              <button
                onClick={connect}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-opacity hover:opacity-70"
                style={{ borderColor: "var(--border)", color: "var(--sterile-ink)" }}>
                Connect wallet
              </button>
            )}

            <Link
              href="/merchant"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-70"
              style={{ color: "var(--muted-graphite)" }}>
              I&apos;m a merchant →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t py-20" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="text-xs font-mono mb-2" style={{ color: "var(--muted-graphite)" }}>THE CLINIC RAIL</div>
            <h2 className="font-display text-3xl font-semibold">How a claim moves through Reymedi</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div key={i} className="rounded-2xl p-6 border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "var(--pale-mint)" }}>
                      <Icon size={18} style={{ color: "var(--remedy-green)" }} />
                    </div>
                    <span className="text-xs font-mono" style={{ color: "var(--muted-graphite)" }}>0{i + 1}</span>
                  </div>
                  <h3 className="font-display font-semibold mb-2">{stage.title}</h3>
                  <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>{stage.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-20" style={{ borderColor: "var(--border)", background: "var(--sterile-ink)" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-3xl font-semibold mb-2" style={{ color: "var(--clinic-porcelain)" }}>
              Open a remedy case
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-graphite)" }}>
              Browse active pools and submit your service failure claim.
            </p>
          </div>
          <Link
            href="/pools"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 whitespace-nowrap"
            style={{ background: "var(--remedy-green)", color: "#fff" }}>
            Browse remedy pools
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </ClinicShell>
  );
}
