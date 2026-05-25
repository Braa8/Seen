import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./Providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://seen-newspaper.vercel.app"),
  title: { default: "سين | منصة صحفية", template: "%s | سين" },
  description: "منصة صحفية عربية متطورة. لأن الصحافة سؤال.",
  openGraph: {
    title: "سين | منصة صحفية",
    description: "منصة صحفية عربية متطورة",
    locale: "ar_SA",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { fontFamily: "Segoe UI, Tahoma, sans-serif", direction: "rtl" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
