import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "1600 — SAT prep that tells you what to do next",
  description: "Guided SAT study sessions with clear next steps.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

/** Base styles if a dev CSS chunk fails to load (prevents “pure HTML” flash). */
const criticalCss = `
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #f8f5ef;
    color: #111111;
    font-family: var(--font-inter), system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }
  button, input, select, textarea { font: inherit; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#F8F5EF] font-sans text-[#111111] antialiased`}>
        {children}
      </body>
    </html>
  );
}
