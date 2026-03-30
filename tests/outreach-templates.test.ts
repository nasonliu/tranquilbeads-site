import { describe, expect, it } from "vitest";

import {
  chooseOutreachTemplateVariant,
  loadOutreachTemplates,
  renderOutreachTemplate,
  resolveOutreachLocale,
} from "@/src/lib/outreach-templates";

describe("outreach templates", () => {
  it("renders the approved WhatsApp personalized template in English", () => {
    const templates = loadOutreachTemplates();
    const template = templates.find(
      (item) => item.channel === "whatsapp" && item.variant === "personalized",
    );

    expect(template).toBeDefined();
    expect(
      renderOutreachTemplate(template!, {
        lead: { company: "Noor Retail Group" },
        websiteUrl: "https://www.tranquilbeads.com",
        locale: "en",
      }),
    ).toEqual({
      subject: null,
      body:
        "Hello, this is Nason from TranquilBeads.\n\n" +
        "We supply premium tasbih and gift-ready Islamic products for wholesale partners, gift shops, and distributors.\n\n" +
        "I came across Noor Retail Group and thought our collection may be relevant for your market. You can view our website here:\n" +
        "https://www.tranquilbeads.com\n\n" +
        "I’m also sharing two product photos for a quick reference. If this is of interest, I’d be happy to send suitable product options with MOQ, packaging, and lead time details.",
      attachmentImageCount: 2,
    });
  });

  it("renders the approved WhatsApp personalized template in Arabic", () => {
    const templates = loadOutreachTemplates();
    const template = templates.find(
      (item) => item.channel === "whatsapp" && item.variant === "personalized",
    );

    expect(template).toBeDefined();
    expect(
      renderOutreachTemplate(template!, {
        lead: { company: "Noor Retail Group" },
        websiteUrl: "https://www.tranquilbeads.com",
        locale: "ar",
      }),
    ).toEqual({
      subject: null,
      body:
        "مرحبًا، أنا Nason من TranquilBeads.\n\n" +
        "نحن نوفر سبحات ومنتجات إسلامية جاهزة للهدايا بجودة عالية لشركاء الجملة ومتاجر الهدايا والموزعين.\n\n" +
        "اطلعت على Noor Retail Group واعتقدت أن مجموعتنا قد تكون مناسبة لسوقكم. يمكنكم زيارة موقعنا هنا:\n" +
        "https://www.tranquilbeads.com\n\n" +
        "كما أشارك صورتين للمنتج كمرجع سريع. إذا كان هذا مناسبًا لكم، يسعدني إرسال خيارات مناسبة مع الحد الأدنى للطلب والتغليف ومدة التوريد.",
      attachmentImageCount: 2,
    });
  });

  it("renders the approved email personalized template and falls back to English", () => {
    const templates = loadOutreachTemplates();
    const template = templates.find(
      (item) => item.channel === "email" && item.variant === "personalized",
    );

    expect(template).toBeDefined();
    expect(
      renderOutreachTemplate(template!, {
        lead: { company: "Noor Retail Group" },
        websiteUrl: "https://www.tranquilbeads.com",
        locale: "fr",
      }),
    ).toEqual({
      subject: "Premium Tasbih Collection for Noor Retail Group",
      body:
        "Hello,\n\n" +
        "This is Nason from TranquilBeads.\n\n" +
        "We supply premium tasbih and gift-ready Islamic products for wholesale partners, gift shops, and distributors.\n\n" +
        "I came across Noor Retail Group and thought our collection could be a good match for your market. You can view our website here:\n" +
        "https://www.tranquilbeads.com\n\n" +
        "I’ve also attached two product images for a quick reference. If relevant for your business, I’d be happy to send suitable product options together with MOQ, packaging, and lead time details.\n\n" +
        "Best regards,\n" +
        "Nason\n" +
        "TranquilBeads\n" +
        "https://www.tranquilbeads.com\n\n" +
        "If you prefer not to receive further emails from us, please reply with unsubscribe and we will remove you from future outreach.",
      attachmentImageCount: 2,
    });
  });

  it("prefers personalized copy when the company name looks trustworthy", () => {
    expect(chooseOutreachTemplateVariant("Noor Retail Group")).toBe("personalized");
    expect(chooseOutreachTemplateVariant("")).toBe("generic");
    expect(chooseOutreachTemplateVariant("Sample")).toBe("generic");
  });

  it("maps Gulf and Arabic-market countries to Arabic with English fallback elsewhere", () => {
    expect(resolveOutreachLocale({ country: "UAE" })).toBe("ar");
    expect(resolveOutreachLocale({ country: "United Arab Emirates" })).toBe("ar");
    expect(resolveOutreachLocale({ country: "Saudi Arabia" })).toBe("ar");
    expect(resolveOutreachLocale({ country: "Qatar" })).toBe("ar");
    expect(resolveOutreachLocale({ country: "Nigeria" })).toBe("en");
    expect(resolveOutreachLocale({ country: "France" })).toBe("en");
  });

  it("lets an explicit locale override the country default", () => {
    expect(resolveOutreachLocale({ country: "UAE", locale: "en" })).toBe("en");
    expect(resolveOutreachLocale({ country: "France", locale: "ar" })).toBe("ar");
  });
});
