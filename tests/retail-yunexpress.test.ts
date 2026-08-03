import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getYunExpressConfig, listYunExpressCountries, probeYunExpressCoverage, quoteYunExpressShipping, resetYunExpressTokenCacheForTests, signYunExpressRequest, verifyYunExpressConnection } from "@/src/lib/retail/yunexpress";

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
    expect(calls[0].url).toBe("https://openapi-sbx.yunexpress.cn/openapi/oauth2/token");
    const quoteUrl=new URL(calls[1].url);
    expect(`${quoteUrl.origin}${quoteUrl.pathname}`).toBe("https://openapi-sbx.yunexpress.cn/v1/price-trial/get");
    expect(Object.fromEntries(quoteUrl.searchParams)).toMatchObject({country_code:"US",postal_code:"10001",weight:"0.3",length:"18",width:"12",height:"6",origin:"YT-SZ"});
    expect(calls[1].init.method).toBe("GET");
    expect(calls[1].init.body).toBeUndefined();
    const headers=calls[1].init.headers as Record<string,string>;
    expect(headers.token).toBe("t".repeat(32)); expect(headers.date).toBe("1700000000000"); expect(headers.sign).toBe(signYunExpressRequest({date:headers.date,method:"GET",uri:`${quoteUrl.pathname}${quoteUrl.search}`},"secret-test"));
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

  it("coalesces concurrent OAuth requests and safely reuses short-lived tokens", async () => {
    let tokenCalls=0;
    const fetcher=vi.fn(async ()=>{tokenCalls+=1;await new Promise((resolve)=>setTimeout(resolve,5));return new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:60}),{status:200});}) as unknown as typeof fetch;
    await Promise.all([verifyYunExpressConnection(fetcher,1_700_000_000_000),verifyYunExpressConnection(fetcher,1_700_000_000_000)]);
    await verifyYunExpressConnection(fetcher,1_700_000_010_000);
    expect(tokenCalls).toBe(1);
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

  it("normalizes and deduplicates the provider country list", async () => {
    let calls=0;
    const fetcher=vi.fn(async (_url:string|URL|Request)=>++calls===1
      ? new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200})
      : new Response(JSON.stringify({success:true,result:[
        {country_code:"US",country_name_en:"United States",status:1},
        {countryCode:"de",countryName:"Germany",enabled:true},
        {country_code:"US",country_name_en:"USA",status:0},
        {country_code:"INVALID",country_name_en:"Invalid"},
      ]}),{status:200})) as unknown as typeof fetch;
    await expect(listYunExpressCountries(fetcher,1_700_000_000_000)).resolves.toEqual([
      {code:"DE",name:"Germany",active:true},
      {code:"US",name:"United States",active:true},
    ]);
  });

  it("classifies a bounded coverage batch without exposing provider messages", async () => {
    let calls=0;
    const fetcher=vi.fn(async (url:string|URL|Request)=>{
      if(++calls===1)return new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200});
      const country=new URL(String(url)).searchParams.get("country_code");
      if(country==="US")return new Response(JSON.stringify({success:true,result:[{product_code:"A1",product_name:"Direct",fee_name:"freight",calculate_amount:7,currency:"USD"}]}),{status:200});
      return new Response(JSON.stringify({success:false,code:"02060015",msg:"internal contract detail"}),{status:200});
    }) as unknown as typeof fetch;
    const results=await probeYunExpressCoverage({countries:[{countryCode:"US",postalCode:"10001"},{countryCode:"DE",postalCode:"10115"}],weightGrams:300,lengthMm:180,widthMm:120,heightMm:60,packageType:"C"},fetcher,1_700_000_000_000);
    expect(results).toEqual([
      expect.objectContaining({countryCode:"US",status:"quote_available",rates:[expect.objectContaining({productCode:"A1",amount:7,currency:"USD"})]}),
      {countryCode:"DE",postalCode:"10115",status:"provider_not_bound",providerCode:"02060015",rates:[]},
    ]);
    expect(JSON.stringify(results)).not.toContain("internal contract detail");
  });

  it("classifies provider HTTP throttling without leaking a response body", async () => {
    let calls=0;
    const fetcher=vi.fn(async ()=>++calls===1
      ? new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200})
      : new Response("provider secret detail",{status:429})) as unknown as typeof fetch;
    const results=await probeYunExpressCoverage({countries:[{countryCode:"US",postalCode:"10001"}],weightGrams:300,lengthMm:180,widthMm:120,heightMm:60,packageType:"C"},fetcher,1_700_000_000_000);
    expect(results).toEqual([{countryCode:"US",postalCode:"10001",status:"provider_throttled",httpStatus:429,rates:[]}]);
    expect(JSON.stringify(results)).not.toContain("provider secret detail");
  });

  it("classifies network failures without leaking details", async () => {
    const failure=new TypeError("private network detail");
    let calls=0;
    const fetcher=vi.fn(async ()=>{if(++calls===1)return new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200});throw failure;}) as unknown as typeof fetch;
    const results=await probeYunExpressCoverage({countries:[{countryCode:"US",postalCode:"10001"}],weightGrams:300,lengthMm:180,widthMm:120,heightMm:60,packageType:"C"},fetcher,1_700_000_000_000);
    expect(results).toEqual([{countryCode:"US",postalCode:"10001",status:"transport_network",rates:[]}]);
    expect(JSON.stringify(results)).not.toContain(failure.message);
  });

  it("classifies only the local eight-second abort as a transport timeout", async () => {
    vi.useFakeTimers();
    try {
      let calls=0;
      const fetcher=vi.fn(async (_url:string|URL|Request,init?:RequestInit)=>{
        if(++calls===1)return new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200});
        return await new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener("abort",()=>reject(Object.assign(new Error("private abort detail"),{name:"AbortError"})),{once:true}));
      }) as unknown as typeof fetch;
      const pending=probeYunExpressCoverage({countries:[{countryCode:"US",postalCode:"10001"}],weightGrams:300,lengthMm:180,widthMm:120,heightMm:60,packageType:"C"},fetcher,1_700_000_000_000);
      await vi.advanceTimersByTimeAsync(8_000);
      await expect(pending).resolves.toEqual([{countryCode:"US",postalCode:"10001",status:"transport_timeout",rates:[]}]);
    } finally { vi.useRealTimers(); }
  });

  it("distinguishes provider HTTP 5xx from invalid JSON without exposing response bodies", async () => {
    const run=async(response:Response)=>{
      resetYunExpressTokenCacheForTests();
      let calls=0;
      const fetcher=vi.fn(async ()=>++calls===1?new Response(JSON.stringify({accessToken:"t".repeat(32),expiresIn:7200}),{status:200}):response) as unknown as typeof fetch;
      return probeYunExpressCoverage({countries:[{countryCode:"DE",postalCode:"10115"}],weightGrams:300,lengthMm:180,widthMm:120,heightMm:60,packageType:"C"},fetcher,1_700_000_000_000);
    };
    await expect(run(new Response("upstream private detail",{status:502}))).resolves.toEqual([{countryCode:"DE",postalCode:"10115",status:"provider_unavailable",httpStatus:502,rates:[]}]);
    const invalid=await run(new Response("not json",{status:200,headers:{"content-type":"text/html"}}));
    expect(invalid).toEqual([{countryCode:"DE",postalCode:"10115",status:"invalid_provider_payload",rates:[]}]);
    expect(JSON.stringify(invalid)).not.toContain("not json");
  });

  it("keeps OAuth-stage provider diagnostics visible in the coverage route and admin UI", () => {
    const root=process.cwd();
    const route=fs.readFileSync(path.join(root,"app/api/admin/retail/shipping/provider/coverage/route.ts"),"utf8");
    const panel=fs.readFileSync(path.join(root,"app/admin/retail/yunexpress-provider-panel.tsx"),"utf8");
    expect(route).toContain("classifyYunExpressFailure(error)");
    expect(route).toContain("providerStatus: failure.status");
    expect(panel).toContain("body.providerStatus");
    expect(panel).toContain("httpStatus:body.httpStatus");
  });
});
