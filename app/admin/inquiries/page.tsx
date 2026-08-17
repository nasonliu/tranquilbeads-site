import type { Metadata } from "next";
import { cookies } from "next/headers";

import {
  adminInquiriesSessionCookie,
  isAdminInquiriesConfigured,
  isValidAdminInquiriesSession,
  listWebsiteInquiryLeads,
  type AdminInquiryLead,
} from "@/src/lib/admin-inquiries";

import { signInToAdminInquiries, signOutOfAdminInquiries } from "./actions";

export const metadata: Metadata = {
  title: "Inquiry Admin | TranquilBeads",
  robots: {
    index: false,
    follow: false,
  },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InquiriesAdminPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function InquiriesAdminPage({
  searchParams,
}: InquiriesAdminPageProps) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminInquiriesSessionCookie)?.value;
  const isSignedIn = isValidAdminInquiriesSession(sessionToken);
  const { error } = await searchParams;

  if (!isAdminInquiriesConfigured()) {
    return (
      <AdminShell>
        <div className="noor-panel rounded-[1.5rem] p-6 sm:p-8">
          <p className="text-sm font-semibold text-accent-deep">Setup required</p>
          <h1 className="noor-title mt-3 text-4xl">Inquiry admin is not configured</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Set an environment variable named ADMIN_INQUIRIES_PASSWORD with at
            least 12 characters, then redeploy the site.
          </p>
        </div>
      </AdminShell>
    );
  }

  if (!isSignedIn) {
    return (
      <AdminShell>
        <LoginPanel showError={error === "invalid"} />
      </AdminShell>
    );
  }

  const inquiries = await listWebsiteInquiryLeads();

  return (
    <AdminShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent-deep">TranquilBeads Admin</p>
          <h1 className="noor-title mt-2 text-4xl sm:text-5xl">Website inquiries</h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            Form submissions from the contact page, newest first.
          </p>
        </div>
        <form action={signOutOfAdminInquiries}>
          <button
            type="submit"
            className="rounded-full border border-border/80 bg-white/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent/50 hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>

      <StatsBar inquiries={inquiries} />

      <div className="noor-panel overflow-hidden rounded-[1.5rem]">
        {inquiries.length > 0 ? (
          <InquiryTable inquiries={inquiries} />
        ) : (
          <div className="p-8 text-sm leading-7 text-muted">
            No website inquiry submissions yet.
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
    </main>
  );
}

function LoginPanel({ showError }: { showError: boolean }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="noor-panel rounded-[1.5rem] p-6 sm:p-8">
        <p className="text-sm font-semibold text-accent-deep">Private dashboard</p>
        <h1 className="noor-title mt-3 text-4xl">Inquiry admin</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          Enter the admin password to view customer form submissions.
        </p>
        <form action={signInToAdminInquiries} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Password
            <input
              className="noor-input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {showError ? (
            <p className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Incorrect password. Please try again.
            </p>
          ) : null}
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-deep"
          >
            View inquiries
          </button>
        </form>
      </div>
    </div>
  );
}

function StatsBar({ inquiries }: { inquiries: AdminInquiryLead[] }) {
  const latestInquiry = inquiries[0];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Total inquiries" value={inquiries.length.toString()} />
      <StatCard
        label="Latest submission"
        value={latestInquiry ? formatDate(latestInquiry.createdAt) : "None"}
      />
      <StatCard
        label="Primary source"
        value={latestInquiry?.sourcePath || "/contact"}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/80 bg-white/55 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InquiryTable({ inquiries }: { inquiries: AdminInquiryLead[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-white/45 text-xs uppercase tracking-[0.16em] text-muted">
          <tr>
            <th className="px-5 py-4 font-semibold">Submitted</th>
            <th className="px-5 py-4 font-semibold">Company</th>
            <th className="px-5 py-4 font-semibold">Contact</th>
            <th className="px-5 py-4 font-semibold">Country</th>
            <th className="px-5 py-4 font-semibold">Source</th>
            <th className="px-5 py-4 font-semibold">Inquiry</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            <tr key={inquiry.id} className="border-t border-border/80 align-top">
              <td className="whitespace-nowrap px-5 py-5 text-muted">
                {formatDate(inquiry.createdAt)}
              </td>
              <td className="px-5 py-5">
                <p className="font-semibold text-foreground">{inquiry.company}</p>
                <p className="mt-1 text-xs text-muted">{inquiry.id}</p>
              </td>
              <td className="px-5 py-5">
                <p className="font-medium text-foreground">{inquiry.contactName}</p>
                <p className="mt-1 text-muted">{inquiry.email || "No contact supplied"}</p>
              </td>
              <td className="px-5 py-5 text-muted">{inquiry.country || "-"}</td>
              <td className="px-5 py-5 text-muted">{inquiry.sourcePath}</td>
              <td className="max-w-xl px-5 py-5 leading-7 text-muted">{inquiry.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}
