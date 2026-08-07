import type { Metadata } from "next";
import { Suspense } from "react";
import { Prompt } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "หอพักเขียวหวาน - ระบบบริหารจัดการหอพัก",
  description: "ระบบจัดการค่าเช่า ค่าน้ำ ค่าไฟ และรายรับ-รายจ่ายหอพักเขียวหวาน",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        <div className="flex min-h-screen">
          <Suspense fallback={<div className="w-16 shrink-0 bg-brand-600 md:w-60" />}>
            <Sidebar />
          </Suspense>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
