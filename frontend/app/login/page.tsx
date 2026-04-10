"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const nextPath = redirect?.startsWith("/") ? redirect : "/admin";
    router.replace(nextPath);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </main>
  );
}
