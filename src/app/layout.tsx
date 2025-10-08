import "@/styles/globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AutoNote Pro",
  description: "녹음 + 메모 작성 앱",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.className} ${geistMono.className} font-sans min-h-screen`}>
        {children}
      </body>
    </html>
  );
}


