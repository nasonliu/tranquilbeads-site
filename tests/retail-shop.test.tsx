import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("next/link", () => ({ default: ({children,href,...props}: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
import { RetailShop, loadRetailPaypalSdk } from "@/src/components/retail-shop";
import { getRetailCopy } from "@/src/data/retail/copy";

const product = { sku:"sku-new", name:{en:"New",ar:"جديد"}, description:{en:"d",ar:"و"}, image:"/retail.jpg", priceMinor:100, currency:"USD" as const, available:true, stock:2 };
const zones = [{country:"US",name:{en:"United States",ar:"الولايات المتحدة"},shippingMinor:250,freeShippingThresholdMinor:null,taxRateBps:500}];
afterEach(() => { document.body.replaceChildren(); window.localStorage.clear(); delete window.paypal; });

describe("retail shop catalog", () => {
  it("keeps shop focused on catalog selection and persists only a variant SKU quantity", () => {
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client" currency="USD" copy={getRetailCopy("en")} />);
    fireEvent.click(screen.getByRole("button", {name:"Add to cart New"}));
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe('{"sku-new":1}');
    expect(screen.queryByText("Delivery address")).toBeNull();
    expect(screen.queryByText("Confirm price")).toBeNull();
  });
  it("keeps the legacy checkout PII key cleared", async () => {
    window.localStorage.setItem("noor-retail-checkout-v1", JSON.stringify({email:"buyer@example.com",line1:"1 Main St"}));
    render(<RetailShop locale="en" products={[product]} zones={zones} enabled paypalClientId="client" currency="USD" copy={getRetailCopy("en")} />);
    await vi.waitFor(() => expect(window.localStorage.getItem("noor-retail-checkout-v1")).toBeNull());
  });
  it("keeps the PayPal SDK helper available for checkout and uses the requested locale", () => {
    void loadRetailPaypalSdk("client-zh", "USD", "zh");
    expect(document.querySelector('script[src*="locale=zh_CN"]')).not.toBeNull();
  });
});
