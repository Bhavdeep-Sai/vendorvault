import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0891b2', // cyan-600
};

export const metadata: Metadata = {
  title: "VendorVault - Railway Vendor License Management",
  description: "Professional digital platform for railway vendor license management, application, renewal, and verification with QR code technology.",
  keywords: ["railway", "vendor", "license", "management", "QR code", "verification", "digital license"],
  authors: [{ name: "VendorVault Team" }],
  creator: "VendorVault",
  publisher: "VendorVault",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'VendorVault',
    title: 'VendorVault - Railway Vendor License Management',
    description: 'Professional digital platform for railway vendor license management',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-slate-900`}
      >
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'bg-white text-slate-900 border border-slate-200',
              duration: 4000,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

