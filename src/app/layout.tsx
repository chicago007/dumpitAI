import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dumpit — 한 줄 입력, 자동 분류",
  description: "메모·할일·일정을 한 줄로 입력하면 자동으로 분류해 주는 스마트 앱",
  manifest: "/manifest.webmanifest",
  applicationName: "Dumpit",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dumpit",
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
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
