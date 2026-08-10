"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function UnderlineField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  disabled,
  trailing,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative pt-5">
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-0 transition-all duration-200",
          focused || value
            ? "top-0 text-[11px]"
            : "top-5 text-sm",
          focused ? "text-[#1d9851]" : "text-muted-foreground/70"
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full border-0 bg-transparent px-0 pb-2 pt-1 text-sm text-foreground outline-none ring-0",
            "placeholder:text-transparent",
            trailing ? "pr-8" : "",
            "disabled:opacity-60"
          )}
        />
        {trailing}
      </div>
      <span
        className={cn(
          "absolute bottom-0 left-0 h-px w-full transition-colors duration-200",
          focused ? "bg-[#1d9851]" : "bg-foreground/15"
        )}
      />
      <span
        className={cn(
          "absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-0 bg-[#1d9851] transition-transform duration-200",
          focused && "scale-x-100"
        )}
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    authError ? "Authentication failed. Please try again." : null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setFormError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        portal: "staff",
        redirect: false,
      });

      if (result?.error) {
        const message = "Invalid email or password.";
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success("Welcome back to Bilal Pharmacy");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      const message = "Something went wrong. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <UnderlineField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        disabled={isSubmitting}
      />

      <UnderlineField
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        disabled={isSubmitting}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        }
      />

      {formError ? (
        <p role="alert" className="text-xs text-[#d4322a]">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "mt-2 flex h-11 w-full items-center justify-center rounded-md bg-[#1d9851] text-sm font-semibold text-white transition-all",
          "hover:bg-[#178544] active:scale-[0.99]",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </button>

      <div className="pt-1 text-center">
        <Link
          href="/"
          className="text-[11px] font-medium text-muted-foreground/70 transition-colors hover:text-[#1d9851]"
        >
          Back to website
        </Link>
      </div>
    </form>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-[#1d9851]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
