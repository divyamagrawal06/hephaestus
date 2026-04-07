import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hephaestus — Predictive Industrial Intelligence",
  description:
    "See equipment failure before it happens. AI-powered predictive maintenance for industrial fleets.",
  keywords: [
    "predictive maintenance",
    "industrial AI",
    "fleet management",
    "equipment monitoring",
  ],
  openGraph: {
    title: "Hephaestus — Predictive Industrial Intelligence",
    description: "See equipment failure before it happens.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
