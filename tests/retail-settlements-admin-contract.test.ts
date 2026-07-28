// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
const read=(path:string)=>readFileSync(path,"utf8");
describe("retail settlement admin route contract",()=>{
  it("uses independent pages instead of adding another panel to the legacy console",()=>{for(const page of ["imports","transactions","payouts","exceptions"])expect(read(`app/admin/retail/settlements/${page}/page.tsx`)).toContain(`<SettlementConsole view="${page}"`);expect(read("app/admin/retail/settlements/page.tsx")).toContain('redirect("/admin/retail/settlements/imports")')});
  it("returns only allowlisted transaction, match, payout, and payout-item columns",()=>{const service=read("src/lib/retail/settlements.ts");for(const value of ["listPayPalSettlementDetails","paypal_transaction_id","match_kind","paypal_payout_id","paypal_payout_item_id"])expect(service).toContain(value);const detail=service.slice(service.indexOf("export async function listPayPalSettlementDetails"),service.indexOf("export async function closePayPalSettlementException"));for(const forbidden of ["normalized_payload","raw_payload","email","customer_snapshot","shipping_snapshot"])expect(detail).not.toContain(forbidden)});
  it("keeps finance permission, bounded pagination, and no-store semantics",()=>{const route=read("app/api/admin/retail/settlements/route.ts");expect(route).toContain('requireRetailPermission("finance:read")');expect(route).toContain("max(200)");expect(route).toContain('"cache-control":"no-store"')});
});
