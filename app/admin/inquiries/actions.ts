"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  adminInquiriesSessionCookie,
  createAdminInquiriesSessionToken,
  isValidAdminInquiriesPassword,
} from "@/src/lib/admin-inquiries";

const oneWeekInSeconds = 60 * 60 * 24 * 7;

export async function signInToAdminInquiries(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  if (!isValidAdminInquiriesPassword(password)) {
    redirect("/admin/inquiries?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(adminInquiriesSessionCookie, createAdminInquiriesSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: oneWeekInSeconds,
    path: "/admin/inquiries",
  });

  redirect("/admin/inquiries");
}

export async function signOutOfAdminInquiries() {
  const cookieStore = await cookies();
  cookieStore.delete(adminInquiriesSessionCookie);

  redirect("/admin/inquiries");
}
