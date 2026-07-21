import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { withBase } from "../lib/basePath";

// Next does NOT prepend basePath to metadata URLs — prefix them explicitly so
// the manifest and icons resolve under a GitHub Pages project subpath.
export const metadata: Metadata = {
  title: { default: "FarmGraph Rakshak", template: "%s · FarmGraph Rakshak" },
  description:
    "Offline Crop Health & Outbreak Intelligence Grid for Rajasthan. Demo prototype — all data simulated.",
  manifest: withBase("/manifest.webmanifest"),
  icons: { icon: withBase("/icons/icon.svg"), apple: withBase("/icons/icon-192.png") },
};

export const viewport: Viewport = {
  themeColor: "#17233b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
