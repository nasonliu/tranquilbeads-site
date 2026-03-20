"use client";

import { useState } from "react";

import type { Locale } from "@/src/lib/i18n";

type InquiryFormProps = {
  locale: Locale;
  interestOptions: string[];
  whatsappHref: string;
  submissionEndpoint?: string;
  copy?: {
    title?: string;
    description?: string;
    labels?: {
      name: string;
      company: string;
      country: string;
      contact: string;
      interest: string;
      quantity: string;
      message: string;
    };
    submit?: string;
    success?: string;
    validation?: {
      name: string;
      company: string;
      country: string;
      contact: string;
      interest: string;
      quantity: string;
      message: string;
    };
    whatsappLabel?: string;
  };
};

type FormState = {
  name: string;
  company: string;
  country: string;
  contact: string;
  interest: string;
  quantity: string;
  message: string;
};

const emptyState: FormState = {
  name: "",
  company: "",
  country: "",
  contact: "",
  interest: "",
  quantity: "",
  message: "",
};

function getDefaultCopy(locale: Locale) {
  if (locale === "ar") {
    return {
      labels: {
        name: "الاسم الكامل",
        company: "الشركة",
        country: "الدولة",
        contact: "البريد أو واتساب",
        interest: "فئة الاهتمام",
        quantity: "الكمية التقديرية",
        message: "الرسالة",
      },
      submit: "إرسال الاستفسار",
      success: "شكرًا لك، سنراجع استفسارك ونعود إليك قريبًا.",
      validation: {
        name: "الاسم مطلوب.",
        company: "اسم الشركة مطلوب.",
        country: "الدولة مطلوبة.",
        contact: "بيانات التواصل مطلوبة.",
        interest: "اختر فئة الاهتمام.",
        quantity: "الكمية التقديرية مطلوبة.",
        message: "الرسالة مطلوبة.",
      },
      whatsappLabel: "تحدث عبر واتساب",
    };
  }

  return {
    labels: {
      name: "Full name",
      company: "Company",
      country: "Country",
      contact: "Email or WhatsApp",
      interest: "Interest category",
      quantity: "Estimated quantity",
      message: "Message",
    },
    submit: "Send inquiry",
    success: "Thank you — we will review your inquiry and reply with the best matching assortment.",
    validation: {
      name: "Name is required.",
      company: "Company is required.",
      country: "Country is required.",
      contact: "Contact details are required.",
      interest: "Choose an interest category.",
      quantity: "Estimated quantity is required.",
      message: "Message is required.",
    },
    whatsappLabel: "Chat on WhatsApp",
  };
}

export function InquiryForm({
  locale,
  interestOptions,
  whatsappHref,
  submissionEndpoint,
  copy,
}: InquiryFormProps) {
  const defaults = getDefaultCopy(locale);
  const content = {
    labels: copy?.labels ?? defaults.labels,
    submit: copy?.submit ?? defaults.submit,
    success: copy?.success ?? defaults.success,
    validation: copy?.validation ?? defaults.validation,
    whatsappLabel: copy?.whatsappLabel ?? defaults.whatsappLabel,
  };

  const [values, setValues] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );

  function updateValue(field: keyof FormState, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (!values.name.trim()) nextErrors.name = content.validation.name;
    if (!values.company.trim()) nextErrors.company = content.validation.company;
    if (!values.country.trim()) nextErrors.country = content.validation.country;
    if (!values.contact.trim()) nextErrors.contact = content.validation.contact;
    if (!values.interest.trim()) nextErrors.interest = content.validation.interest;
    if (!values.quantity.trim()) nextErrors.quantity = content.validation.quantity;
    if (!values.message.trim()) nextErrors.message = content.validation.message;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) return;

    setStatus("submitting");

    if (!submissionEndpoint) {
      setStatus("success");
      setValues(emptyState);
      return;
    }

    try {
      const response = await fetch(submissionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setStatus("success");
      setValues(emptyState);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={handleSubmit} noValidate className="grid gap-4">
        <Field
          label={content.labels.name}
          error={errors.name}
          input={
            <input
              className="noor-input"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
            />
          }
        />
        <Field
          label={content.labels.company}
          error={errors.company}
          input={
            <input
              className="noor-input"
              value={values.company}
              onChange={(event) => updateValue("company", event.target.value)}
            />
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={content.labels.country}
            error={errors.country}
            input={
              <input
                className="noor-input"
                value={values.country}
                onChange={(event) => updateValue("country", event.target.value)}
              />
            }
          />
          <Field
            label={content.labels.contact}
            error={errors.contact}
            input={
              <input
                className="noor-input"
                value={values.contact}
                onChange={(event) => updateValue("contact", event.target.value)}
              />
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={content.labels.interest}
            error={errors.interest}
            input={
              <select
                className="noor-input"
                value={values.interest}
                onChange={(event) => updateValue("interest", event.target.value)}
              >
                <option value="">{locale === "en" ? "Select" : "اختر"}</option>
                {interestOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            }
          />
          <Field
            label={content.labels.quantity}
            error={errors.quantity}
            input={
              <input
                className="noor-input"
                value={values.quantity}
                onChange={(event) => updateValue("quantity", event.target.value)}
              />
            }
          />
        </div>
        <Field
          label={content.labels.message}
          error={errors.message}
          input={
            <textarea
              rows={5}
              className="noor-input resize-none"
              value={values.message}
              onChange={(event) => updateValue("message", event.target.value)}
            />
          }
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-60"
          >
            {content.submit}
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="latin-ui rounded-full border border-accent/35 px-5 py-3 text-sm font-semibold text-accent-deep transition hover:bg-accent/10"
          >
            {content.whatsappLabel}
          </a>
        </div>

        {status === "success" ? (
          <p className="rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-accent-deep">
            {content.success}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {locale === "en"
              ? "We could not submit the inquiry automatically. Please use WhatsApp while we investigate."
              : "تعذر إرسال الاستفسار تلقائيًا. يرجى استخدام واتساب مؤقتًا."}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Field({
  label,
  input,
  error,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {input}
      {error ? <span className="block text-sm text-red-700">{error}</span> : null}
    </label>
  );
}
