import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/ui/auth";

export const metadata: Metadata = {
  title: { default: "Udhwa Admin", template: "%s · Udhwa Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f8fafc" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
