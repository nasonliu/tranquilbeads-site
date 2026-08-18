import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettlementConsole } from "@/app/admin/retail/settlements/settlements-console";

const importId="50000000-0000-4000-8000-000000000001",exceptionId="50000000-0000-4000-8000-000000000002";
function payload(options:{imported?:boolean;closed?:boolean}={}){return{ok:true,imports:options.imported?[{id:importId,source_name:"report.csv",source_format:"csv",row_count:1,imported_by:"finance-1",imported_at:"2026-08-02T00:00:00.000Z",open_exceptions:0,content_sha256:"a".repeat(64),raw_payload:"SHOULD-NOT-RENDER",buyer_email:"private@example.test"}]:[],transactions:[{id:"tx-row",paypal_transaction_id:"PAYPAL-TX-1",transaction_type:"Payment",transaction_status:"Completed",currency:"USD",gross_minor:1000,fee_minor:-59,net_minor:941,related_capture_id:"CAPTURE-1",match_count:2,open_exception_count:0,normalized_payload:{buyer_email:"private@example.test"}}],matches:[{id:"match-1",paypal_transaction_id:"PAYPAL-TX-1",match_kind:"gross",ledger_id:"ledger-1",ledger_kind:"payment",amount_minor:1000,currency:"USD",paypal_reference:"CAPTURE-1"}],payouts:[{paypal_payout_id:"PAYOUT-1",status:"Completed",amount_minor:941,currency:"USD",occurred_at:"2026-08-02T00:00:00.000Z",created_at:"2026-08-02T00:00:00.000Z"}],payoutItems:[{id:"item-1",paypal_payout_id:"PAYOUT-1",paypal_payout_item_id:"ITEM-1",paypal_transaction_id:"PAYPAL-TX-1",amount_minor:941,created_at:"2026-08-02T00:00:00.000Z"}],exceptions:options.closed?[]:[{id:exceptionId,state:"open",code:"unmatched_transaction",paypal_transaction_id:"PAYPAL-TX-2",related_capture_id:"CAPTURE-2",gross_minor:500,created_at:"2026-08-02T00:00:00.000Z",detail:{customer_email:"private@example.test"}}]}}

describe("retail PayPal settlement admin",()=>{
  afterEach(()=>{localStorage.clear();vi.unstubAllGlobals()});
  it("renders separate transaction and payout views in Chinese without raw payload or PII",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify(payload({imported:true})),{status:200})));
    const {unmount}=render(<SettlementConsole view="transactions"/>);
    await screen.findAllByText("PAYPAL-TX-1");
    fireEvent.change(screen.getByLabelText("Language"),{target:{value:"zh"}});
    expect(screen.getByRole("heading",{name:"PayPal 结算对账"})).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Payout 结算"})).toHaveAttribute("href","/admin/retail/settlements/payouts");
    expect(screen.queryByText("private@example.test")).not.toBeInTheDocument();
    expect(screen.queryByText("SHOULD-NOT-RENDER")).not.toBeInTheDocument();
    unmount();
    render(<SettlementConsole view="payouts"/>);
    expect(await screen.findAllByText("PAYOUT-1")).toHaveLength(2);
    expect(screen.getByText("ITEM-1")).toBeInTheDocument();
  });

  it("requires review plus confirmation before importing and verifies the import readback",async()=>{
    let imported=false;const confirmer=vi.fn(()=>false);
    const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{if(init?.method==="POST"){imported=true;return new Response(JSON.stringify({ok:true,import:{import_id:importId}}),{status:200})}return new Response(JSON.stringify(payload({imported})),{status:200})});
    vi.stubGlobal("fetch",fetcher);vi.stubGlobal("confirm",confirmer);
    render(<SettlementConsole view="imports"/>);await screen.findByText("No records.");
    const file=new File(["Transaction ID,Transaction Type,Transaction Status,Currency,Gross\nT1,Payment,Completed,USD,1.00\n"],"paypal-report.csv",{type:"text/csv"});Object.defineProperty(file,"text",{value:async()=>"Transaction ID,Transaction Type,Transaction Status,Currency,Gross\nT1,Payment,Completed,USD,1.00\n"});
    fireEvent.change(screen.getByLabelText("PayPal report file"),{target:{files:[file]}});fireEvent.click(screen.getByRole("button",{name:"Review import"}));
    fireEvent.click(screen.getByRole("button",{name:"Confirm import"}));expect(fetcher.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(0);
    confirmer.mockReturnValue(true);fireEvent.click(screen.getByRole("button",{name:"Confirm import"}));
    expect(await screen.findByText("Import completed and readback confirmed.")).toBeInTheDocument();
    const write=fetcher.mock.calls.find(([,init])=>init?.method==="POST")!;const body=JSON.parse(String(write[1]?.body));expect(body).toMatchObject({filename:"paypal-report.csv",format:"csv"});expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);expect(confirmer).toHaveBeenCalledWith(expect.stringContaining("Import this report"));expect(screen.getByText("report.csv")).toBeInTheDocument();
  });

  it("syncs PayPal reports through the API and verifies the imported run by readback",async()=>{
    let synced=false;
    const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      if(String(input)==="/api/admin/retail/settlements/sync"&&init?.method==="POST"){
        synced=true;
        return new Response(JSON.stringify({ok:true,rowCount:1,imported:{import_id:importId}}),{status:200});
      }
      return new Response(JSON.stringify(payload({imported:synced})),{status:200});
    });
    vi.stubGlobal("fetch",fetcher);
    render(<SettlementConsole view="imports"/>);
    await screen.findByText("No records.");
    fireEvent.click(screen.getByRole("button",{name:"Sync now"}));
    expect(await screen.findByText("PayPal sync completed and readback confirmed.")).toBeInTheDocument();
    expect(screen.getByText("report.csv")).toBeInTheDocument();
    const sync=fetcher.mock.calls.find(([path,init])=>String(path).endsWith("/sync")&&init?.method==="POST")!;
    expect(JSON.parse(String(sync[1]?.body))).toMatchObject({days:7});
  });

  it("requires a review note and confirmation before closing an exception, then verifies readback",async()=>{
    let closed=false;const confirmer=vi.fn(()=>false);
    const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{if(init?.method==="POST"){closed=true;return new Response(JSON.stringify({ok:true}),{status:200})}return new Response(JSON.stringify(payload({closed})),{status:200})});
    vi.stubGlobal("fetch",fetcher);vi.stubGlobal("confirm",confirmer);render(<SettlementConsole view="exceptions"/>);
    const card=(await screen.findByText("PAYPAL-TX-2")).closest("article")!;const scoped=within(card);expect(scoped.getByRole("button",{name:"Close exception"})).toBeDisabled();
    fireEvent.change(scoped.getByLabelText("Review note"),{target:{value:"Compared against PayPal activity report"}});fireEvent.click(scoped.getByRole("button",{name:"Close exception"}));expect(fetcher.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(0);
    confirmer.mockReturnValue(true);fireEvent.click(scoped.getByRole("button",{name:"Close exception"}));
    expect(await screen.findByText("Exception closed and readback confirmed.")).toBeInTheDocument();await waitFor(()=>expect(screen.queryByText("PAYPAL-TX-2")).not.toBeInTheDocument());
    const write=fetcher.mock.calls.find(([,init])=>init?.method==="POST")!;expect(String(write[0])).toContain(`/exceptions/${exceptionId}/close`);expect(JSON.parse(String(write[1]?.body)).note).toBe("Compared against PayPal activity report");expect(confirmer).toHaveBeenCalledWith(expect.stringContaining("manual review"));
  });
});
