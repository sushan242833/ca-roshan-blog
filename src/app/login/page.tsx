"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ApiRequestError } from "@/lib/api";
import { SITE_NAME } from "@/config/site.config";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

export default function LoginPage() {
  const router = useRouter();
  const { admin, isLoading, login } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!isLoading && admin) {
      router.replace("/admin/dashboard");
    }
  }, [isLoading, admin, router]);

  async function onSubmit(data: LoginFormValues) {
    try {
      await login(data.email, data.password);
      router.replace("/admin/dashboard");
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiRequestError
            ? err.message
            : "Something went wrong. Please try again.",
      });
    }
  }

  if (isLoading || admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-brand-teal" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-16">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-brand-navy">
          {SITE_NAME}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Admin Control Panel</p>
      </div>

      <div className="mt-8 w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className={inputClass}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className={inputClass}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600">
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand-teal-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
