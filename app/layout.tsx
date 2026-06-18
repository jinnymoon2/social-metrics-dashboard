import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Metrics Dashboard",
  description: "Track Instagram, LinkedIn, X, and OKKY post metrics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
