import { appConfig } from "@/lib/config";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="mt-3 text-sm text-slate-500">
        We sent a verification link for your {appConfig.name} account. Open it to confirm your email, then sign in.
      </p>
      <Link href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
        Return to sign in
      </Link>
    </div>
  );
}
