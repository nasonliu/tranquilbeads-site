import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
import { RetailCartButton, RetailCartDrawer, RetailCartProvider, addRetailCart } from "@/src/components/retail-cart";

afterEach(() => { document.body.replaceChildren(); window.localStorage.clear(); vi.unstubAllGlobals(); });

describe("retail header bag", () => {
  it("keeps only SKU quantities locally and closes an accessible drawer with Escape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ products: [{ sku:"product", name:{en:"Beads",ar:"خرز"}, image:"/one.jpg", variants:[{sku:"sku-1",name:{en:"33 beads",ar:"33 حبة"},priceMinor:1200,stock:4,available:true}] }] }))));
    render(<RetailCartProvider><RetailCartButton locale="en" /><RetailCartDrawer locale="en" /></RetailCartProvider>);
    addRetailCart("sku-1", 2, 4);
    expect(window.localStorage.getItem("noor-retail-cart-v1")).toBe('{"sku-1":2}');
    fireEvent.click(await screen.findByRole("button", { name: /Shopping bag, 2 items/ }));
    expect(await screen.findByRole("dialog", { name: "Your bag" })).toBeInTheDocument();
    expect(await screen.findByText("Beads · 33 beads")).toBeInTheDocument();
    fireEvent.keyDown(window, { key:"Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
