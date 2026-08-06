import { Suspense } from "react";
import { Building2 } from "lucide-react";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Building2 className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <h1 className="mt-3 text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h1>
        <p className="text-sm text-gray-500">สำหรับเจ้าของหอพักเขียวหวาน</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
