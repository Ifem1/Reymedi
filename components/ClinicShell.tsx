"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@/lib/hooks/useWallet";
import { STUDIONET } from "@/lib/chain";
import { AlertTriangle, Wifi, WifiOff, LogOut } from "lucide-react";

interface ClinicShellProps {
  children: React.ReactNode;
}

export function ClinicShell({ children }: ClinicShellProps) {
  const { address, connected, onCorrectChain, connect, disconnect, error } = useWallet();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--clinic-porcelain)", color: "var(--sterile-ink)" }}>
      {/* Top nav */}
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--remedy-green)" }}>
              <span className="text-white font-bold text-sm font-mono">R</span>
            </div>
            <span className="font-display text-xl font-semibold tracking-tight" style={{ color: "var(--sterile-ink)" }}>
              Reymedi
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "var(--pale-mint)", color: "var(--deep-teal)" }}>
              Clinic
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: "var(--muted-graphite)" }}>
            <Link href="/pools" className="hover:opacity-70 transition-opacity">Remedy Pools</Link>
            <Link href="/me" className="hover:opacity-70 transition-opacity">My Cases</Link>
            <Link href="/merchant" className="hover:opacity-70 transition-opacity">Merchant Room</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Chain status */}
            {connected && (
              <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md"
                style={{
                  background: onCorrectChain ? "var(--pale-mint)" : "#FEF3C7",
                  color: onCorrectChain ? "var(--deep-teal)" : "#92400E",
                }}>
                {onCorrectChain ? <Wifi size={12} /> : <WifiOff size={12} />}
                {onCorrectChain ? "StudioNet" : "Wrong Network"}
              </div>
            )}

            {connected ? (
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono px-3 py-1.5 rounded-md border"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  {address!.slice(0, 6)}…{address!.slice(-4)}
                </div>
                <button
                  onClick={disconnect}
                  title="Disconnect wallet"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--muted-graphite)" }}>
                  <LogOut size={12} />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="text-sm px-4 py-1.5 rounded-md font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--sterile-ink)", color: "var(--clinic-porcelain)" }}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Network warning */}
      {connected && !onCorrectChain && (
        <div className="flex items-center gap-2 px-6 py-2 text-sm"
          style={{ background: "#FEF3C7", color: "#92400E", borderBottom: "1px solid #FDE68A" }}>
          <AlertTriangle size={14} />
          Please switch to {STUDIONET.name} (Chain ID {STUDIONET.id}) to use Reymedi.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-2 text-sm"
          style={{ background: "#FEE2E2", color: "#991B1B", borderBottom: "1px solid #FECACA" }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs" style={{ color: "var(--muted-graphite)" }}>
          <span className="font-display">Reymedi Clinic</span>
          <span className="font-mono">StudioNet · Chain {STUDIONET.id}</span>
        </div>
      </footer>
    </div>
  );
}
