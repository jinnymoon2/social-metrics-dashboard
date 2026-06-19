import type { Metadata } from "next";
import "./globals.css";
import { InstagramOAuthBridge } from "./components/instagram-oauth-bridge";

export const metadata: Metadata = {
  title: "Social Metrics Dashboard",
  description: "Track Instagram and OKKY metrics in one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <InstagramOAuthBridge />
        {children}
      </body>
    </html>
  );
}
