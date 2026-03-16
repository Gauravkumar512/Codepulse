import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "../components/ToasterProvider";

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
      </body>
    </html>
  );
}
