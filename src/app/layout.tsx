import type { Metadata, Viewport } from "next";
import { APP_NAME, APP_TAGLINE, APP_TITLE } from "@/lib/app-brand";
import { getAppearanceTheme } from "@/actions/appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getAppearanceTheme();

  return (
    <html lang="ko" data-theme={theme} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
