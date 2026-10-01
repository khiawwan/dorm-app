"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { User, Lock, LogIn, Loader2 } from "lucide-react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" : "ระบบไม่พร้อมใช้งาน กรุณาลองอีกครั้ง");
        setLoading(false);
        return;
      }
      const target = new URL(searchParams.get("redirect") || "/manage", window.location.origin);
      // A full navigation uses the new session and keeps feedback visible until the page is ready.
      window.location.assign(target.origin === window.location.origin && target.pathname.startsWith("/manage")
        ? target.pathname + target.search
        : "/manage");
    } catch {
      setError("เชื่อมต่อไม่สำเร็จหรือใช้เวลานานเกินไป กรุณาลองอีกครั้ง");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={loading}
      className="flex flex-col gap-4 rounded-xl2 border border-brand-100 bg-white p-6 shadow-soft"
    >
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <User className="h-3.5 w-3.5 text-brand-500" /> ชื่อผู้ใช้
        </label>
        <input
          type="text"
          aria-label="ชื่อผู้ใช้"
          disabled={loading}
          autoComplete="username"
          className="block w-full rounded-xl2 border border-brand-100 px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Lock className="h-3.5 w-3.5 text-brand-500" /> รหัสผ่าน
        </label>
        <input
          type="password"
          aria-label="รหัสผ่าน"
          disabled={loading}
          autoComplete="current-password"
          className="block w-full rounded-xl2 border border-brand-100 px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p role="alert" className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <LogIn aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />}
        {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-center text-xs text-gray-500">{loading ? "กรุณารอสักครู่ ระบบกำลังพาคุณไปหน้าจัดการ" : ""}</p>
    </form>
  );
}
