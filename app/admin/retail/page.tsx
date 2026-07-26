import { verifyRetailAdminSession } from "@/src/lib/retail/admin-auth";
import { cookies } from "next/headers";
import { RetailAdminConsole, RetailAdminLogin } from "./ui";

export const dynamic = "force-dynamic";

export default async function RetailAdminPage() {
  const authenticated = verifyRetailAdminSession((await cookies()).get("retail_admin")?.value);
  return authenticated ? <RetailAdminConsole /> : <RetailAdminLogin />;
}
