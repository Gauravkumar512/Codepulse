import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "../components/ToasterProvider";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "CodePulse",
  description: "Code security scanner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
      <ToasterProvider/>
        {children}
        <Analytics/>
      </body>
    </html>
  );
}
