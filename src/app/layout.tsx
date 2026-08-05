import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccessibilityMenu } from "@/components/accessibility-menu";
import { MotionExperience } from "@/components/motion-experience";
import { publicEnvironment } from "@/config/env/public";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnvironment.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Fate Light",
    template: "%s | Fate Light",
  },
  description: "Fate Light — Clareza financeira. Caminho Certo.",
  icons: {
    apple: "/favicons/favicon-180x180.png",
    icon: [
      { sizes: "16x16", type: "image/png", url: "/favicons/favicon-16x16.png" },
      { sizes: "32x32", type: "image/png", url: "/favicons/favicon-32x32.png" },
      { sizes: "48x48", type: "image/png", url: "/favicons/favicon-48x48.png" },
      { sizes: "64x64", type: "image/png", url: "/favicons/favicon-64x64.png" },
      { sizes: "128x128", type: "image/png", url: "/favicons/favicon-128x128.png" },
      { sizes: "180x180", type: "image/png", url: "/favicons/favicon-180x180.png" },
      { sizes: "192x192", type: "image/png", url: "/favicons/favicon-192x192.png" },
      { sizes: "256x256", type: "image/png", url: "/favicons/favicon-256x256.png" },
      { sizes: "512x512", type: "image/png", url: "/favicons/favicon-512x512.png" },
    ],
    shortcut: "/favicons/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body>
        {children}
        <div id="portal-root" />
        <MotionExperience />
        <AccessibilityMenu />
      </body>
    </html>
  );
}
