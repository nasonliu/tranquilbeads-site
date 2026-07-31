import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getYunExpressConfig, quoteYunExpressShipping, resetYunExpressTokenCacheForTests, signYunExpressRequest, verifyYunExpressConnection } from "@/src/lib/retail/yunexpress";

const saved = { env:process.env.YUNEXPRESS_ENV, appId:process.env.YUNEXPRESS_APP_ID, appSecret:process.env.YUNEXPRESS_APP_SECRET, sourceKey:process.env.YUNEXPRESS_SOURCE_KEY, origin:process.env.YUNEXPRESS_ORIGIN_CODE };
const restore = (name:string,value:string|undefined) => value===undefined ? delete process.env[name] : void (process.env[name]=value);

describe("YunExpress provider adapter", () => {
  beforeEach(()=>{resetYunExpressTokenCacheForTests();process.env.YUNEXPRESS_ENV="sandbox";process.env.YUNEXPRESS_APP_ID="app-test";process.env.YUNEXPRESS_APP_SECRET="secret-test";process.env.YUNEXPRESS_SOURCE_KEY="source-test";process.env.YUNEXPRESS_ORIGIN_CODE="YT-SZ";});
  afterEach(()=>{resetYunExpressTokenCacheForTests();restore("YUNEXPRESS_ENV",saved.env);restore("YUNEXPRESS_APP_ID",saved.appId);restore("YUNEXPRESS_APP_SECRET",saved.appSecret);restore("YUNEXPRESS_SOURCE_KEY",saved.sourceKey);restore("YUNEXPRESS_ORIGIN_CODE",saved.origin);});

  it("matches the documented sorted HMAC-SHA256 signature contract", () => {
    const input={date:"1651049235123",method:"POST",uri:"/api/test",body:"{}"};
    const content="body={}&date=1651049235123&method=POST&uri=/api/test";
    const expected=crypto.createHmac("sha256","test-secret").update(content,"utf8").digest("base64");
    expect(signYunExpressRequest(input,"test-secret")).toBe(expected);
  });

  it("uses only official environment hosts, obtains a token, signs a quote, and aggregates fee lines", async () => {
    const calls:Array<{url:string;init:RequestInit}> = [];
    const fetcher=vi.fn(async (url:string|URL|Request,init?:RequestInit)=>{calls.push({url:String(url),init:init??{}});if(calls.length===1)return new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200});return new Response(JSON.stringify({success:true,result:[
      {product_code:"A1",product_name:"Direct",fee_name:"freight",calculate_amount:7,currency:"CNY",interval_day:"5-8",price_name:"Contract",price_type:"AG",convert_currency:"USD",convert_amount:1,origin:"YT-SZ"},
      {product_code:"A1",product_name:"Direct",fee_name:"fuel",calculate_amount:3.5,currency:"CNY",interval_day:"5-8",price_name:"Contract",price_type:"AG",convert_currency:"USD",convert_amount:.5,origin:"YT-SZ"},
      {product_code:"B2",product_name:"Express",fee_name:"freight",calculate_amount:21,currency:"CNY",interval_day:"3-5",price_name:"Contract",price_type:"AG",convert_currency:"USD",convert_amount:3,origin:"YT-SZ"},
    ]}),{status:200});}) as unknown as typeof fetch;
    const rates=await quoteYunExpressShipping({countryCode:"US",postalCode:"10001",weightGrams:300,lengthMm:180,widthMm:120,heightMm:60,packageType:"C"},fetcher,1_700_000_000_000);
    expect(calls.map((call)=>call.url)).toEqual(["https://openapi-sbx.yunexpress.cn/openapi/oauth2/token","https://openapi-sbx.yunexpress.cn/v1/price-trial/get_V2"]);
    expect(JSON.parse(String(calls[1].init.body))).toMatchObject({country_code:"US",postal_code:"10001",weight:.3,length:18,width:12,height:6,origin:"YT-SZ"});
    const headers=calls[1].init.headers as Record<string,string>;
    expect(headers.token).toBe("t".repeat(32)); expect(headers.date).toBe("1700000000000"); expect(headers.sign).toBe(signYunExpressRequest({date:headers.date,method:"POST",uri:"/v1/price-trial/get_V2",body:String(calls[1].init.body)},"secret-test"));
    expect(rates).toEqual([
      expect.objectContaining({productCode:"A1",amount:1.5,currency:"USD",deliveryWindow:"5-8",fees:expect.arrayContaining([expect.objectContaining({name:"freight"}),expect.objectContaining({name:"fuel"})])}),
      expect.objectContaining({productCode:"B2",amount:3,currency:"USD"}),
    ]);
  });

  it("does not expose credentials in connection status and fails closed when configuration is missing", async () => {
    delete process.env.YUNEXPRESS_APP_SECRET;
    expect(getYunExpressConfig()).toBeNull();
    await expect(verifyYunExpressConnection()).resolves.toEqual({configured:false,authenticated:false,environment:null});
  });

  it("protects admin provider routes and never exposes a public write endpoint", () => {
    const root=process.cwd();
    const status=fs.readFileSync(path.join(root,"app/api/admin/retail/shipping/provider/status/route.ts"),"utf8");
    const quote=fs.readFileSync(path.join(root,"app/api/admin/retail/shipping/provider/quote/route.ts"),"utf8");
    expect(status).toContain('requireRetailPermission("shipping:write")');
    expect(quote).toContain('requireRetailPermission("shipping:write")');
    expect(quote).toContain("assertSameOrigin");
    expect(quote).toContain("consumeRetailRateLimit");
    expect(fs.existsSync(path.join(root,"app/api/retail/shipping/provider"))).toBe(false);
  });
});
