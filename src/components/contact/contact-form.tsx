"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  MAX_CONTACT_MESSAGE_LENGTH,
  MAX_CONTACT_NAME_LENGTH,
} from "@/lib/constants";

const CONTACT_SUBJECTS = [
  "General Inquiry",
  "Tax Consultation",
  "Audit Services",
  "Financial Planning",
  "Other",
] as const;

// zod v4 renamed `errorMap` to `error` for custom issue messages.
const contactSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(MAX_CONTACT_NAME_LENGTH),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(MAX_CONTACT_NAME_LENGTH),
  email: z.string().email("Please enter a valid email address"),
  subject: z.enum(CONTACT_SUBJECTS, {
    error: () => "Please select a subject",
  }),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(MAX_CONTACT_MESSAGE_LENGTH),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
  "placeholder:text-gray-400 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

type SubmitStatus = "idle" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      message: "",
    },
  });

  async function onSubmit(data: ContactFormValues) {
    setStatus("idle");
    setErrorMessage("");

    const name = `${data.firstName.trim()} ${data.lastName.trim()}`;
    try {
      await apiRequest("/v1/contact", {
        method: "POST",
        body: JSON.stringify({
          name,
          email: data.email,
          subject: data.subject,
          message: data.message,
        }),
      });
      setStatus("success");
      reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof ApiRequestError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <h2 className="font-serif text-lg font-bold text-brand-navy">
        Send an Inquiry
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-4 space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              First Name
            </label>
            <input
              id="firstName"
              {...register("firstName")}
              className={inputClass}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <input
              id="lastName"
              {...register("lastName")}
              className={inputClass}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

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
            {...register("email")}
            className={inputClass}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="subject"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Subject
          </label>
          <select
            id="subject"
            defaultValue=""
            {...register("subject")}
            className={inputClass}
          >
            <option value="" disabled>
              Select a subject
            </option>
            {CONTACT_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          {errors.subject && (
            <p className="mt-1 text-xs text-red-500">
              {errors.subject.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="message"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Message
          </label>
          <textarea
            id="message"
            rows={5}
            placeholder="How can we assist you?"
            {...register("message")}
            className={inputClass}
          />
          {errors.message && (
            <p className="mt-1 text-xs text-red-500">
              {errors.message.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-teal-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Submit Inquiry"}
        </button>

        {status === "success" && (
          <div className="flex items-start gap-3 rounded-md border border-brand-teal/30 bg-brand-teal/5 p-4">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-brand-teal"
            />
            <p className="text-sm text-brand-teal">
              Your inquiry has been submitted. We will be in touch within 2
              business days.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-600">
              {errorMessage || "Something went wrong. Please try again."}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
