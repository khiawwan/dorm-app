"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, LogIn } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      const redirect = searchParams.get("redirect") || "/manage";
      router.push(redirect);
      router.refresh();
    } else {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl2 border border-brand-100 bg-white p-6 shadow-soft"
    >
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <User className="h-3.5 w-3.5 text-brand-500" /> ชื่อผู้ใช้
        </label>
        <input
          type="text"
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
          autoComplete="current-password"
          className="block w-full rounded-xl2 border border-brand-100 px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-1.5 rounded-xl2 bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" strokeWidth={2.25} />
        {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
