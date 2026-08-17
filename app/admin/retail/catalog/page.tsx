import { redirect } from "next/navigation";

// Variants now live under their owning product alongside SKCs, media, and
// price/inventory. Keep the former URL as a safe compatibility entry point.
export default function Page() { redirect("/admin/retail/products"); }
