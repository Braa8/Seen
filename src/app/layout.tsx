import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./Provider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: " Seen",
  description: " Newspaper ",
  keywords: ["news", "articles", "politic", "technology", "sport", "art"],
  authors: [{ name: "فريق سين" }],
  creator: "Braa Alshoumary",
  publisher: "Braa Alshoumary",
  
  // إعدادات اللوغو والأيقونات
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: "/logo.png"
  },
  
  // Open Graph للشبكات الاجتماعية
  openGraph: {
    title: "مدونتي - لأن الصّحافة سُؤال",
    description: "موقع إخباري شامل يقدم أحدث الأخبار والمقالات في مختلف المجالات",
    url: "https://yourdomain.com",
    siteName: "مدونتي",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "مدونتي - لوغو الموقع"
      }
    ],
    locale: "ar_SA",
    type: "website"
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "مدونتي - لأن الصّحافة سُؤال",
    description: "موقع إخباري شامل يقدم أحدث الأخبار والمقالات في مختلف المجالات",
    images: ["/logo.png"],
    creator: "@myblog"
  },
  
  // إعدادات إضافية
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  
  // Manifest للـ PWA
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-mono antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}