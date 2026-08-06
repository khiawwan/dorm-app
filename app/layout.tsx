import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

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
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
