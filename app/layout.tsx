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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Suspense
            fallback={
              <div className="h-20 shrink-0 bg-slate-900 md:h-screen md:w-64" />
            }
          >
            <Sidebar />
          </Suspense>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
