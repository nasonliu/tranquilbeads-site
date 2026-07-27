import { cookies } from "next/headers";
import { verifyRetailAdminSession } from "@/src/lib/retail/admin-auth";
import { RetailAdminLogin } from "./ui";

export const dynamic = "force-dynamic";

export default async function RetailAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authenticated = verifyRetailAdminSession((await cookies()).get("retail_admin")?.value);
  return authenticated ? children : <RetailAdminLogin />;
}
