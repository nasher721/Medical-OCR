"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/app/dashboard");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!orgName.trim()) {
      setError("Organization name is required.");
      setLoading(false);
      return;
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create user account.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: authData.user.id,
      display_name: displayName || email.split("@")[0],
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { data: orgData, error: orgError } = await supabase
      .from("orgs")
      .insert({ name: orgName.trim() })
      .select()
      .single();

    if (orgError || !orgData) {
      setError(orgError?.message ?? "Failed to create organization.");
      setLoading(false);
      return;
    }

    const { error: membershipError } = await supabase
      .from("memberships")
      .insert({
        org_id: orgData.id,
        user_id: authData.user.id,
        role: "admin",
      });

    if (membershipError) {
      setError(membershipError.message);
      setLoading(false);
      return;
    }

    router.push("/app/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl animate-gradient-shift" style={{ backgroundSize: '200% 200%' }} />
        <div className="absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-gradient-to-tl from-cyan-600/15 via-blue-600/10 to-transparent blur-3xl animate-gradient-shift" style={{ backgroundSize: '200% 200%', animationDelay: '4s' }} />
        <div className="absolute left-1/2 top-1/2 h-[50%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/30 animate-float">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Medical OCR</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligent document processing for medical records
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-lg font-semibold text-card-foreground">
            {isSignUp ? "Create an account" : "Sign in to your account"}
          </h2>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          <form
            onSubmit={isSignUp ? handleSignUp : handleSignIn}
            className="space-y-4"
          >
            {isSignUp && (
              <>
                <div>
                  <label
                    htmlFor="displayName"
                    className="mb-1.5 block text-[13px] font-medium text-foreground"
                  >
                    Full Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-accent/50 px-4 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/30"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label
                    htmlFor="orgName"
                    className="mb-1.5 block text-[13px] font-medium text-foreground"
                  >
                    Organization Name
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-accent/50 px-4 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/30"
                    placeholder="Acme Medical Group"
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-accent/50 px-4 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="flex h-11 w-full rounded-xl border border-white/[0.08] bg-accent/50 px-4 py-2 text-sm text-foreground ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/30"
                placeholder="Min. 6 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 ring-offset-background transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              {loading
                ? "Please wait..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-[13px] text-muted-foreground">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setError(null);
                  }}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                  }}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
