"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (_event === "SIGNED_OUT") {
        router.push("/login");
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
