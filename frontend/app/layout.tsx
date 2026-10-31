import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Client Hub | Agency OS", description: "Client operating and communication workspace for Neirah Tech." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
