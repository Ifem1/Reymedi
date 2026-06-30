import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reymedi — Service Failure Compensation Court",
  description: "A GenLayer-native compensation court. Submit evidence, escrow GEN, let AI validators judge the fair remedy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
