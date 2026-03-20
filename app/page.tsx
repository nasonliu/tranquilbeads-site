import { redirect } from "next/navigation";

import { defaultLocale } from "@/src/lib/i18n";

export default function IndexPage() {
  redirect(`/${defaultLocale}`);
}
