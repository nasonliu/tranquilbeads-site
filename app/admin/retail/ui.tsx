"use client";

import Image from "next/image";
import {
  ArrowLeft,
  BadgeCheck,
  Boxes,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CircleAlert,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileImage,
  LayoutDashboard,
  LayoutTemplate,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Settings,
  ShoppingBag,
  Trash2,
  Truck,
  Upload,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";

import {
  columnCopy,
  fieldCopy,
  getAdminCopy,
  paymentKindText,
  shippingMethodText,
  statusText,
  type AdminCopyKey,
  type AdminLocale,
} from "./admin-locale";
import { localizeRetailVariantOptions } from "@/src/data/retail/types";
import { YunExpressProviderPanel } from "./yunexpress-provider-panel";

type Row = Record<string, unknown>;
type RetailAdminSection =
  | "overview"
  | "orders"
  | "products"
  | "pages"
  | "catalog"
  | "promotions"
  | "marketing"
  | "inventory"
  | "returns"
  | "customers"
  | "finance"
  | "settlements"
  | "settings"
  | "security"
  | "media"
  | "audit"
  | "system"
  | "legacy";

const AdminLocaleContext = createContext<AdminLocale>("en");
const optionalFields = new Set([
  "addressId",
  "name",
  "line2",
  "region",
  "postalCode",
  "phone",
  "note",
  "slug",
  "titleEn",
  "titleAr",
  "titleZh",
  "descriptionEn",
  "descriptionAr",
  "descriptionZh",
  "isDefault",
  "archive",
]);

const sectionIcons: Record<Exclude<RetailAdminSection, "legacy">, LucideIcon> = {
  overview: LayoutDashboard,
  orders: ShoppingBag,
  products: Package,
  pages: LayoutTemplate,
  catalog: Package,
  promotions: ReceiptText,
  marketing: Mail,
  inventory: Boxes,
  returns: PackageCheck,
  customers: Users,
  finance: CreditCard,
  settlements: CreditCard,
  settings: Settings,
  security: KeyRound,
  media: FileImage,
  audit: ClipboardList,
  system: Wrench,
};

type AdminNavGroup = {
  section: Exclude<RetailAdminSection, "legacy" | "catalog" | "media" | "audit" | "system" | "settlements" | "inventory" | "returns" | "promotions" | "marketing" | "security">;
  children?: Array<Exclude<RetailAdminSection, "legacy" | "catalog">>;
};

// Keep operational tools discoverable without presenting every database domain
// as an equally important top-level destination. Product variants and media are
// managed from their owning product; the legacy /catalog route remains only as
// a compatibility redirect.
const adminNavGroups: AdminNavGroup[] = [
  { section: "overview" },
  { section: "pages" },
  { section: "products", children: ["inventory"] },
  { section: "orders", children: ["returns"] },
  { section: "customers", children: ["marketing", "promotions"] },
  { section: "finance", children: ["settlements"] },
  { section: "settings", children: ["security", "audit", "system"] },
];
const uuid = () => crypto.randomUUID();

function useAdminLocale() {
  return useContext(AdminLocaleContext);
}

function useStoredLocale() {
  const [locale, setLocaleState] = useState<AdminLocale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("retail_admin_locale");
    if (saved === "en" || saved === "zh") setLocaleState(saved);
  }, []);

  const setLocale = (next: AdminLocale) => {
    localStorage.setItem("retail_admin_locale", next);
    setLocaleState(next);
  };

  return [locale, setLocale] as const;
}

function currencyCode(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : "USD";
}

function money(minor: unknown, currency: unknown, locale: AdminLocale) {
  const value = Number(minor);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: currencyCode(currency),
  }).format(value / 100);
}

function dateTime(value: unknown, locale: AdminLocale) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function maskedEmail(value: unknown) {
  const text = String(value ?? "");
  const at = text.indexOf("@");
  if (at < 1) return "—";
  return `${text.slice(0, 1)}•••${text.slice(at)}`;
}

function maskedName(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? `${text.slice(0, 1)}•••` : "—";
}

function maskedAddress(value: Row | undefined) {
  if (!value) return "—";
  const city = String(value.city ?? "");
  const country = String(value.country ?? "");
  const postal = String(value.postal_code ?? value.postalCode ?? "");
  return [city, country, postal ? `•••${postal.slice(-3)}` : ""].filter(Boolean).join(", ") || "—";
}

function redactedAddresses(value: unknown) {
  if (!Array.isArray(value)) return "—";
  return value
    .map((address) => {
      const row = address as Row;
      const id = String(row.id ?? "");
      const city = String(row.city ?? "");
      const country = String(row.country ?? "");
      return [id, city, country].filter(Boolean).join(" · ");
    })
    .join("\n");
}

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error ?? "request_failed");
  return data as Row;
}

function resultError(error: unknown, fallback: string, locale: AdminLocale) {
  const code = error instanceof Error ? error.message.toLowerCase().replaceAll(" ", "_") : "request_failed";
  const copy = getAdminCopy(locale);
  if (code.includes("unauthorized") || code.includes("session")) return copy.errorUnauthorized;
  if (code.includes("rate_limited")) return copy.errorRateLimited;
  if (code.includes("idempotency") || code.includes("conflict")) return copy.errorIdempotencyConflict;
  if (code.includes("result_unknown") || code.includes("reconciliation_pending")) return copy.writeReadback;
  if (code.includes("order_state") || code.includes("already_") || code.includes("not_captured")) return copy.errorOrderState;
  if (code.includes("invalid") || code.includes("validation")) return copy.errorInvalidRequest;
  return fallback;
}

export function RetailAdminLogin() {
  const [locale, setLocale] = useStoredLocale();
  const copy = getAdminCopy(locale);
  const actorIdCopy = locale === "zh"
    ? { label: "操作员 ID（可选）", hint: "留空则使用兼容旧版的零售管理员登录。" }
    : { label: "Operator ID (optional)", hint: "Leave blank to use the legacy retail-admin login." };
  const [actorId, setActorId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [linkPending, setLinkPending] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const [error, setError] = useState("");
  const magicCopy = locale === "zh"
    ? { divider: "或者", label: "管理员邮箱", action: "发送一次性登录链接", sent: "如果邮箱已获授权，登录链接将在几分钟内送达。" }
    : { divider: "or", label: "Admin email", action: "Email me a one-time sign-in link", sent: "If this email is authorized, a sign-in link will arrive within a few minutes." };

  return (
    <AdminLocaleContext.Provider value={locale}>
      <main className="noor-container py-16" lang={locale === "zh" ? "zh-CN" : "en"}>
        <form
          className="noor-panel mx-auto max-w-md rounded-2xl p-7"
          onSubmit={async (event) => {
            event.preventDefault();
            const response = await fetch("/api/admin/retail/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ actorId: actorId.trim() || undefined, password }),
            });
            if (response.ok) location.reload();
            else {
              const result = await response.json().catch(() => ({})) as { error?: string };
              setError(response.status === 401 ? copy.loginInvalid : result.error === "rate_limited" ? copy.errorRateLimited : copy.loginUnavailable);
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-2xl">TranquilBeads</p>
              <h1 className="mt-2 text-xl font-semibold">{copy.retailAdmin}</h1>
            </div>
            <select
              aria-label={copy.language}
              className="rounded-md border border-[#cdbda9] bg-white px-2 py-2 text-sm"
              value={locale}
              onChange={(event) => setLocale(event.target.value as AdminLocale)}
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <input
            type="text"
            name="username"
            autoComplete="username"
            value="retail-admin"
            readOnly
            className="sr-only"
            tabIndex={-1}
          />
          <label className="mt-6 block text-sm" htmlFor="retail-admin-operator-id">
            {actorIdCopy.label}
          </label>
          <div className="mt-2">
            <input
              id="retail-admin-operator-id"
              aria-describedby="retail-admin-operator-id-hint"
              className="w-full rounded-lg border border-[#cdbda9] bg-white p-3"
              type="text"
              autoComplete="username"
              maxLength={100}
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
            />
            <span id="retail-admin-operator-id-hint" className="mt-1 block text-xs text-muted">{actorIdCopy.hint}</span>
          </div>
          <label className="mt-6 block text-sm">
            {copy.password}
            <input
              className="mt-2 w-full rounded-lg border border-[#cdbda9] bg-white p-3"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="mt-5 w-full rounded-lg bg-accent px-4 py-3 font-medium text-white">
            {copy.signIn}
          </button>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-[#dfd2c0]"/><span>{magicCopy.divider}</span><span className="h-px flex-1 bg-[#dfd2c0]"/></div>
          <label className="block text-sm">
            {magicCopy.label}
            <input className="mt-2 w-full rounded-lg border border-[#cdbda9] bg-white p-3" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button className="mt-4 w-full rounded-lg border border-accent/40 px-4 py-3 font-medium text-accent-deep disabled:opacity-60" type="button" disabled={linkPending || !email.trim()} onClick={async()=>{setLinkPending(true);setLinkMessage("");try{await fetch("/api/admin/retail/auth/request-link",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:email.trim()})});setLinkMessage(magicCopy.sent);}finally{setLinkPending(false);}}}>
            {linkPending ? "…" : magicCopy.action}
          </button>
          {linkMessage && <p className="mt-3 text-sm text-[#52603d]" role="status">{linkMessage}</p>}
        </form>
      </main>
    </AdminLocaleContext.Provider>
  );
}

function AdminForm({
  titleKey,
  fields,
  submit,
  refresh,
}: {
  titleKey: AdminCopyKey;
  fields: string[];
  submit: (data: Record<string, string>, idempotencyKey: string) => Promise<unknown>;
  refresh: () => Promise<boolean>;
}) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const idempotencyKey = useRef<string | null>(null);

  return (
    <form
      className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5"
      onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true;
        setPending(true);
        const form = event.currentTarget;
        try {
          await submit(
            Object.fromEntries(new FormData(form)) as Record<string, string>,
            (idempotencyKey.current ??= uuid()),
          );
          if (await refresh()) {
            form.reset();
            idempotencyKey.current = null;
            setResult(copy.saved);
          } else {
            setResult(copy.writeReadback);
          }
        } catch (error) {
          setResult(resultError(error, copy.saveFailed, locale));
        } finally {
          submitting.current = false;
          setPending(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold">{copy[titleKey]}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.map((name) => (
          <label className="text-sm" key={name}>
            <span>{fieldCopy[locale][name] ?? name}</span>
            {name.startsWith("description") ? (
              <textarea
                aria-label={name}
                className="mt-1 min-h-24 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
                name={name}
              />
            ) : (
              <input
                aria-label={name}
                className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
                name={name}
                placeholder={
                  name === "isDefault" || name === "archive"
                    ? locale === "zh"
                      ? "true、false 或留空"
                      : "true, false, or blank"
                    : undefined
                }
                required={!optionalFields.has(name)}
              />
            )}
          </label>
        ))}
      </div>
      <button className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-white" disabled={pending}>
        {pending ? copy.saving : copy.save}
      </button>
      {result && <p className="mt-3 text-sm" role="status">{result}</p>}
    </form>
  );
}

function CustomerAddressManager({ customers, refresh }: { customers: Row[]; refresh: () => Promise<boolean> }) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  const [customerId, setCustomerId] = useState("");
  const [addressChoice, setAddressChoice] = useState("new");
  const [customer, setCustomer] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = useState(false);
  const [archive, setArchive] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const submitting = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const addresses = Array.isArray(customer?.addresses) ? customer.addresses as Row[] : [];

  const loadAddressBook = useCallback(async (id = customerId) => {
    if (!id) { setResult(copy.noCustomerSelected); return false; }
    setPending(true);
    try {
      const response = await api(`/api/admin/retail/customers/${id}`);
      const next = response.customer as Row;
      setCustomer(next);
      const nextAddresses = Array.isArray(next.addresses) ? next.addresses as Row[] : [];
      const selected = nextAddresses.find((address) => String(address.id) === addressChoice) ?? nextAddresses.find((address) => address.is_default) ?? nextAddresses[0];
      if (selected) {
        setAddressChoice(String(selected.id));
        setDraft({ name: String(next.name ?? ""), recipient: String(selected.recipient ?? ""), line1: String(selected.line1 ?? ""), line2: String(selected.line2 ?? ""), city: String(selected.city ?? ""), region: String(selected.region ?? ""), postalCode: String(selected.postal_code ?? ""), country: String(selected.country ?? ""), phone: String(selected.phone ?? "") });
        setIsDefault(selected.is_default === true);
        setArchive(Boolean(selected.archived_at));
      } else {
        setAddressChoice("new");
        setDraft({ name: String(next.name ?? ""), recipient: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "", phone: "" });
        setIsDefault(true);
        setArchive(false);
      }
      setResult(copy.addressBookLoaded);
      return true;
    } catch (error) {
      const code = error instanceof Error ? error.message.toLowerCase() : "";
      setResult(code.includes("forbidden") || code.includes("pii") ? copy.addressReadDenied : resultError(error, copy.loadFailed, locale));
      return false;
    } finally { setPending(false); }
  }, [addressChoice, copy.addressBookLoaded, copy.addressReadDenied, copy.loadFailed, copy.noCustomerSelected, customerId, locale]);

  const chooseAddress = (nextId: string) => {
    setAddressChoice(nextId);
    idempotencyKey.current = null;
    if (nextId === "new") {
      setDraft((current) => ({ ...current, recipient: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "", phone: "" }));
      setIsDefault(!addresses.some((address) => address.is_default && !address.archived_at));
      setArchive(false);
      return;
    }
    const selected = addresses.find((address) => String(address.id) === nextId);
    if (!selected) return;
    setDraft((current) => ({ ...current, recipient: String(selected.recipient ?? ""), line1: String(selected.line1 ?? ""), line2: String(selected.line2 ?? ""), city: String(selected.city ?? ""), region: String(selected.region ?? ""), postalCode: String(selected.postal_code ?? ""), country: String(selected.country ?? ""), phone: String(selected.phone ?? "") }));
    setIsDefault(selected.is_default === true);
    setArchive(Boolean(selected.archived_at));
  };

  const customerLabel = (entry: Row) => `${String(entry.name ?? "—")} · ${String(entry.email ?? "—")}`;
  const fieldNames = ["name", "recipient", "line1", "line2", "city", "region", "postalCode", "country", "phone"];
  const canEdit = Boolean(customer);
  return (
    <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
      <h2 className="text-lg font-semibold">{copy.customerAddressManager}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">{copy.customerAddressHelp}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="text-sm"><span>{copy.selectCustomer}</span><select aria-label={copy.selectCustomer} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" value={customerId} onChange={(event) => { setCustomerId(event.target.value); setCustomer(null); setAddressChoice("new"); setDraft({}); setResult(""); idempotencyKey.current = null; }}><option value="">—</option>{customers.map((entry) => <option key={String(entry.public_id)} value={String(entry.public_id)}>{customerLabel(entry)}</option>)}</select></label>
        <button className="self-end rounded-lg border border-[#cdbda9] px-4 py-2.5 text-sm" disabled={!customerId || pending} onClick={() => void loadAddressBook()}>{pending ? copy.working : copy.loadAddressBook}</button>
      </div>
      {customer && <form className="mt-5" onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true; setPending(true);
        try {
          const response = await api(`/api/admin/retail/customers/${customerId}`, "PATCH", {
            name: draft.name?.trim() || undefined,
            addressId: addressChoice === "new" ? undefined : addressChoice,
            recipient: draft.recipient?.trim() || undefined,
            line1: draft.line1?.trim() || undefined,
            line2: draft.line2?.trim() ?? "",
            city: draft.city?.trim() || undefined,
            region: draft.region?.trim() ?? "",
            postalCode: draft.postalCode?.trim() ?? "",
            country: draft.country?.trim().toUpperCase() || undefined,
            phone: draft.phone?.trim() ?? "",
            isDefault: isDefault || undefined,
            archive: archive || undefined,
            idempotencyKey: (idempotencyKey.current ??= uuid()),
          });
          // PATCH has already completed a redacted DB readback. Refresh the
          // masked directory, then re-run the explicit PII read for the form.
          if (!response.customer || !(await refresh()) || !(await loadAddressBook(customerId))) {
            setResult(copy.writeReadback);
          } else {
            idempotencyKey.current = null;
            setResult(archive ? copy.addressArchived : copy.addressSaved);
          }
        } catch (error) { setResult(resultError(error, copy.saveFailed, locale)); }
        finally { submitting.current = false; setPending(false); }
      }}>
        <label className="text-sm"><span>{copy.selectAddress}</span><select aria-label={copy.selectAddress} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" value={addressChoice} onChange={(event) => chooseAddress(event.target.value)}><option value="new">{copy.newAddress}</option>{addresses.map((address) => <option key={String(address.id)} value={String(address.id)}>{[String(address.city ?? ""), String(address.country ?? ""), address.is_default ? copy.makeDefault : "", address.archived_at ? copy.archiveAddress : ""].filter(Boolean).join(" · ")}</option>)}</select></label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{fieldNames.map((name) => <label className="text-sm" key={name}><span>{fieldCopy[locale][name]}</span><input aria-label={fieldCopy[locale][name]} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" disabled={!canEdit || pending} name={name} required={["recipient", "line1", "city", "country"].includes(name) && addressChoice === "new"} maxLength={name === "country" ? 2 : undefined} value={draft[name] ?? ""} onChange={(event) => { setDraft((current) => ({ ...current, [name]: event.target.value })); idempotencyKey.current = null; }} /></label>)}</div>
        <div className="mt-4 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input aria-label={copy.makeDefault} type="checkbox" checked={isDefault} disabled={archive || pending} onChange={(event) => { setIsDefault(event.target.checked); idempotencyKey.current = null; }} />{copy.makeDefault}</label>{addressChoice !== "new" && <label className="flex items-center gap-2"><input aria-label={copy.archiveAddress} type="checkbox" checked={archive} disabled={pending} onChange={(event) => { setArchive(event.target.checked); if (event.target.checked) setIsDefault(false); idempotencyKey.current = null; }} />{copy.archiveAddress}</label>}</div>
        <button className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-white" disabled={pending}>{pending ? copy.saving : copy.save}</button>
      </form>}
      {result && <p className="mt-3 text-sm" role="status">{result}</p>}
    </section>
  );
}

function DataTable({
  titleKey,
  rows,
  cols,
}: {
  titleKey: AdminCopyKey;
  rows: Row[];
  cols: string[];
}) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);

  const value = (row: Row, column: string) => {
    if (column === "amount_minor") return money(row[column], row.currency, locale);
    if (column === "email") return maskedEmail(row[column]);
    if (column === "addresses") return redactedAddresses(row[column]);
    if (column === "status" || column === "reconciliation_status") return statusText(locale, row[column]);
    if (column === "kind") return paymentKindText(locale, row[column]);
    if (column === "active") return row[column] ? copy.active : "—";
    if (column.endsWith("_at")) return dateTime(row[column], locale);
    if (typeof row[column] === "object") return JSON.stringify(row[column], null, 2);
    return String(row[column] ?? "—");
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#dfd2c0] bg-[#fbf7f1]">
      <div className="flex items-center justify-between border-b border-[#e4d9ca] px-5 py-4">
        <h2 className="text-lg font-semibold">{copy[titleKey]}</h2>
        <span className="text-sm text-muted">{rows.length} {copy.records}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f4ece1] text-xs uppercase tracking-wide text-[#65584a]">
            <tr>
              {cols.map((column) => <th className="px-4 py-3" key={column}>{columnCopy[locale][column] ?? column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr className="border-t border-[#e8ded1]" key={String(row.id ?? row.public_id ?? index)}>
                {cols.map((column) => (
                  <td className="max-w-72 whitespace-pre-line break-words px-4 py-3 align-top" key={column}>
                    {value(row, column)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr><td className="px-4 py-8 text-center text-muted" colSpan={cols.length}>{copy.noRecords}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShippingZones({ zones, refresh }: { zones: Row[]; refresh: () => Promise<boolean> }) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const shippingIdempotencyKey = useRef<string | null>(null);
  const disableIdempotencyKeys = useRef(new Map<string, string>());

  return (
    <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
      <h2 className="text-lg font-semibold">{copy.shippingZones}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">{copy.shippingDescription}</p>
      <form
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          setPending(true);
          const form = event.currentTarget;
          const data = new FormData(form);
          try {
            await api("/api/admin/retail/shipping", "POST", {
              country: String(data.get("country")).toUpperCase(),
              nameEn: String(data.get("nameEn")),
              nameAr: String(data.get("nameAr")),
              nameZh: String(data.get("nameZh")),
              shippingMinor: Math.round(Number(data.get("shippingUsd")) * 100),
              freeShippingThresholdMinor:
                data.get("freeShippingThresholdUsd") === ""
                  ? null
                  : Math.round(Number(data.get("freeShippingThresholdUsd")) * 100),
              taxRateBps: Math.round(Number(data.get("taxPercent")) * 100),
              carrier: String(data.get("carrier")),
              serviceCode: String(data.get("serviceCode")) || null,
              deliveryMinDays: data.get("deliveryMinDays") === "" ? null : Number(data.get("deliveryMinDays")),
              deliveryMaxDays: data.get("deliveryMaxDays") === "" ? null : Number(data.get("deliveryMaxDays")),
              dutiesMode: String(data.get("dutiesMode")),
              rateSource: String(data.get("rateSource")),
              lastVerifiedAt: data.get("lastVerifiedAt") ? new Date(String(data.get("lastVerifiedAt"))).toISOString() : null,
              active: data.get("active") === "on",
              idempotencyKey: (shippingIdempotencyKey.current ??= uuid()),
            });
            if (await refresh()) {
              shippingIdempotencyKey.current = null;
              form.reset();
              const active = form.elements.namedItem("active") as HTMLInputElement | null;
              if (active) active.checked = false;
              setResult(copy.shippingSaved);
            } else {
              setResult(copy.writeReadback);
            }
          } catch (error) {
            setResult(resultError(error, copy.shippingSaveFailed, locale));
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        {[
          ["country", "text"],
          ["nameEn", "text"],
          ["nameAr", "text"],
          ["nameZh", "text"],
          ["shippingUsd", "number"],
          ["freeShippingThresholdUsd", "number"],
          ["taxPercent", "number"],
          ["carrier", "text"],
          ["serviceCode", "text"],
          ["deliveryMinDays", "number"],
          ["deliveryMaxDays", "number"],
          ["lastVerifiedAt", "date"],
        ].map(([name, type]) => (
          <label className="text-sm" key={name}>
            {name === "shippingUsd" ? (locale === "zh" ? "顾客运费（USD）" : "Customer shipping (USD)") : name === "freeShippingThresholdUsd" ? (locale === "zh" ? "满额免邮门槛（USD，可留空）" : "Free-shipping threshold (USD, optional)") : name === "taxPercent" ? (locale === "zh" ? "税率（%）" : "Tax rate (%)") : fieldCopy[locale][name] ?? name}
            <input
              aria-label={name === "shippingUsd" ? "Customer shipping USD" : name === "freeShippingThresholdUsd" ? "Free shipping threshold USD" : name === "taxPercent" ? "Tax rate percent" : fieldCopy[locale][name] ?? name}
              className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
              name={name}
              type={type}
              maxLength={name === "country" ? 2 : undefined}
              min={type === "number" ? (["deliveryMinDays", "deliveryMaxDays"].includes(name) ? 1 : 0) : undefined}
              max={name === "taxPercent" ? 100 : undefined}
              step={["shippingUsd", "freeShippingThresholdUsd", "taxPercent"].includes(name) ? "0.01" : undefined}
              defaultValue={name === "carrier" ? "YunExpress" : undefined}
              required={!['freeShippingThresholdUsd','serviceCode','deliveryMinDays','deliveryMaxDays','lastVerifiedAt'].includes(name)}
            />
          </label>
        ))}
        <label className="text-sm">
          {fieldCopy[locale].dutiesMode ?? "Duties mode"}
          <select className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" name="dutiesMode" defaultValue="UNKNOWN">
            <option value="UNKNOWN">UNKNOWN</option><option value="DDP">DDP</option><option value="DAP">DAP</option>
          </select>
        </label>
        <label className="text-sm">
          {fieldCopy[locale].rateSource ?? "Rate source"}
          <select className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" name="rateSource" defaultValue="manual_contract">
            <option value="manual_contract">manual_contract</option><option value="provider_api">provider_api</option><option value="estimated">estimated</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="active" type="checkbox" />
          {copy.enabledAtCheckout}
        </label>
        <div>
          <button className="rounded-lg bg-accent px-4 py-2.5 text-white" disabled={pending}>
            {pending ? copy.saving : copy.saveShippingZone}
          </button>
        </div>
      </form>
      {result && <p className="mt-3 text-sm" role="status">{result}</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {["country", "name_en", "carrier", "service_code", "delivery_min_days", "delivery_max_days", "duties_mode", "rate_source", "last_verified_at", "shipping_minor", "free_shipping_threshold_minor", "tax_rate_bps", "active", "action"].map((column) => (
                <th className="px-3 py-2" key={column}>{columnCopy[locale][column] ?? column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.length ? zones.map((zone) => (
              <tr className="border-t border-[#e8ded1]" key={String(zone.country)}>
                {[
                  "country",
                  "name_en",
                  "carrier",
                  "service_code",
                  "delivery_min_days",
                  "delivery_max_days",
                  "duties_mode",
                  "rate_source",
                  "last_verified_at",
                  "shipping_minor",
                  "free_shipping_threshold_minor",
                  "tax_rate_bps",
                  "active",
                ].map((column) => <td className="px-3 py-3" key={column}>{column === "shipping_minor" || column === "free_shipping_threshold_minor" ? (zone[column] === null || zone[column] === undefined ? "—" : money(zone[column], "USD", locale)) : column === "tax_rate_bps" ? `${Number(zone[column] ?? 0) / 100}%` : String(zone[column] ?? "—")}</td>)}
                <td className="px-3 py-3">
                  <button
                    className="rounded-md border border-[#cdbda9] px-3 py-1.5"
                    disabled={pending}
                    onClick={async () => {
                      if (submitting.current || !confirm(copy.disableShippingConfirm)) return;
                      submitting.current = true;
                      setPending(true);
                      const country = String(zone.country);
                      const idempotencyKey = disableIdempotencyKeys.current.get(country) ?? uuid();
                      disableIdempotencyKeys.current.set(country, idempotencyKey);
                      try {
                        await api("/api/admin/retail/shipping", "DELETE", { country, idempotencyKey });
                        if (await refresh()) {
                          disableIdempotencyKeys.current.delete(country);
                          setResult(copy.shippingDisabled);
                        } else {
                          setResult(copy.writeReadback);
                        }
                      } catch (error) {
                        setResult(resultError(error, copy.shippingDisableFailed, locale));
                      } finally {
                        submitting.current = false;
                        setPending(false);
                      }
                    }}
                  >
                    {copy.disable}
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td className="px-3 py-8 text-center text-muted" colSpan={14}>{copy.noRecords}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderActions({
  refresh,
  defaultOrderId,
  embedded = false,
}: {
  refresh: () => Promise<boolean>;
  defaultOrderId?: string;
  embedded?: boolean;
}) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const cancelIdempotencyKey = useRef<string | null>(null);
  const refundIdempotencyKey = useRef<string | null>(null);

  const run = async (
    idempotencyKey: MutableRefObject<string | null>,
    callback: (key: string) => Promise<void>,
    onComplete: () => void,
    successMessage: string,
  ) => {
    if (submitting.current || !confirm(copy.irreversibleConfirm)) return;
    submitting.current = true;
    setPending(true);
    try {
      await callback((idempotencyKey.current ??= uuid()));
      if (await refresh()) {
        idempotencyKey.current = null;
        onComplete();
        setResult(successMessage);
      } else {
        setResult(copy.writeReadback);
      }
    } catch (error) {
      setResult(resultError(error, copy.actionFailed, locale));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  const formClass = embedded
    ? "rounded-lg border border-[#dfd2c0] bg-white/55 p-4"
    : "rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        className={formClass}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const orderId = String(data.get("orderId"));
          const reason = String(data.get("reason"));
          void run(
            cancelIdempotencyKey,
            async (idempotencyKey) => {
              await api(`/api/admin/retail/orders/${orderId}`, "PATCH", {
                action: "cancel",
                reason,
                idempotencyKey,
              });
            },
            () => form.reset(),
            copy.cancellationCompleted,
          );
        }}
      >
        <h3 className="font-semibold">{copy.cancelUnpaid}</h3>
        <p className="mt-2 text-sm text-muted">{copy.cancelHelp}</p>
        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            {fieldCopy[locale].orderId}
            <input
              aria-label={fieldCopy[locale].orderId}
              className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
              defaultValue={defaultOrderId}
              name="orderId"
              type="number"
              min="1"
              required
            />
          </label>
          <label className="text-sm">
            {copy.cancelReason}
            <input
              aria-label={copy.cancelReason}
              className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
              name="reason"
              required
            />
          </label>
        </div>
        <button className="mt-4 rounded-lg border border-[#bda98f] px-4 py-2.5" disabled={pending}>
          {pending ? copy.working : copy.cancelOrder}
        </button>
      </form>

      <form
        id={defaultOrderId ? "refund-order" : undefined}
        className={formClass}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const orderId = String(data.get("orderId"));
          const amountMinor = Number(data.get("amountMinor"));
          const reason = String(data.get("reason"));
          void run(
            refundIdempotencyKey,
            async (idempotencyKey) => {
              await api(`/api/admin/retail/orders/${orderId}/refund`, "POST", {
                amountMinor,
                reason,
                idempotencyKey,
              });
            },
            () => form.reset(),
            copy.refundCompleted,
          );
        }}
      >
        <h3 className="font-semibold">{copy.refundCaptured}</h3>
        <p className="mt-2 text-sm text-muted">{copy.refundHelp}</p>
        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            {fieldCopy[locale].orderId}
            <input
              aria-label={fieldCopy[locale].orderId}
              className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
              defaultValue={defaultOrderId}
              name="orderId"
              type="number"
              min="1"
              required
            />
          </label>
          <label className="text-sm">
            {copy.refundAmount}
            <input
              aria-label={copy.refundAmount}
              className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
              name="amountMinor"
              type="number"
              min="1"
              step="1"
              required
            />
          </label>
          <label className="text-sm">
            {copy.refundReason}
            <input
              aria-label={copy.refundReason}
              className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5"
              name="reason"
              required
            />
          </label>
        </div>
        <button className="mt-4 rounded-lg bg-accent px-4 py-2.5 text-white" disabled={pending}>
          {pending ? copy.working : copy.confirmRefund}
        </button>
      </form>
      {result && <p className="text-sm lg:col-span-2" role="status">{result}</p>}
    </div>
  );
}

function ProductMedia({ products, refresh }: { products: Row[]; refresh: () => Promise<boolean> }) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  const [result, setResult] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const uploadIdempotencyKey = useRef<string | null>(null);
  const reorderKeys = useRef(new Map<string, string>());

  const saveOrder = async (product: Row, imageIds: string[]) => {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    const productId = String(product.public_id ?? product.id ?? "");
    const idempotencyKey = reorderKeys.current.get(productId) ?? uuid();
    reorderKeys.current.set(productId, idempotencyKey);
    try {
      await api("/api/admin/retail/media/reorder", "PATCH", {
        productId,
        imageIds,
        idempotencyKey,
        expectedVersion: Number(product.image_version ?? product.images_version ?? product.version ?? 0),
      });
      reorderKeys.current.delete(productId);
      setResult(await refresh() ? copy.imageOrderSaved : copy.writeReadback);
    } catch (error) {
      setResult(resultError(error, copy.imageOrderFailed, locale));
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
      <h2 className="text-lg font-semibold">{copy.productImages}</h2>
      <p className="mt-2 text-sm text-muted">{copy.imageHelp}</p>
      <form
        className="mt-5 grid gap-3 md:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current) return;
          submitting.current = true;
          setPending(true);
          const form = event.currentTarget;
          try {
            const formData = new FormData(form);
            formData.set("idempotencyKey", (uploadIdempotencyKey.current ??= uuid()));
            const response = await fetch("/api/admin/retail/media", {
              method: "POST",
              body: formData,
            });
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error(data.error ?? "request_failed");
            if (await refresh()) {
              uploadIdempotencyKey.current = null;
              form.reset();
              setResult(copy.uploaded);
            } else {
              setResult(copy.writeReadback);
            }
          } catch (error) {
            setResult(resultError(error, copy.uploadFailed, locale));
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        <label className="text-sm">
          {fieldCopy[locale].productId}
          <input aria-label={fieldCopy[locale].productId} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" name="productId" required />
        </label>
        <label className="text-sm">
          {fieldCopy[locale].file}
          <input aria-label={fieldCopy[locale].file} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        </label>
        <label className="text-sm">
          {fieldCopy[locale].altEn}
          <input aria-label={fieldCopy[locale].altEn} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" name="altEn" />
        </label>
        <label className="text-sm">
          {fieldCopy[locale].altAr}
          <input aria-label={fieldCopy[locale].altAr} className="mt-1 w-full rounded-lg border border-[#cdbda9] bg-white p-2.5" name="altAr" />
        </label>
        <button className="flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-white" disabled={pending}>
          <Upload aria-hidden="true" size={16} />
          {pending ? copy.uploading : copy.uploadImage}
        </button>
      </form>
      {result && <p className="mt-3 text-sm" role="status">{result}</p>}
      <div className="mt-6 space-y-6">
        {products.map((product) => {
          const images = Array.isArray(product.images) ? [...product.images as Row[]].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)) : [];
          return images.length ? <section key={String(product.public_id ?? product.id ?? product.sku)}>
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-medium">{String(product.sku ?? product.title_en ?? "—")}</h3><span className="text-sm text-muted">{copy.imageOrder}</span></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((image, index) => (
                <article className="overflow-hidden rounded-lg border border-[#dfd2c0] bg-white" key={String(image.id)}>
                  <Image
                    unoptimized
                    className="aspect-square w-full object-cover"
                    src={String(image.url)}
                    alt={String(image.alt_en ?? product.title_en ?? "Product image")}
                    width={480}
                    height={480}
                  />
                  <div className="p-3">
                    <p className="text-xs text-muted">{String(image.id)}</p>
                    {index === 0 && <p className="mt-2 text-xs font-medium text-[#496038]">{copy.primaryImage}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button aria-label={copy.moveImageUp} className="rounded-md border border-[#cdbda9] p-1.5 disabled:opacity-50" disabled={pending || index === 0} onClick={() => void saveOrder(product, images.map((entry) => String(entry.id)).map((id, itemIndex, all) => itemIndex === index ? all[index - 1] : itemIndex === index - 1 ? all[index] : id))}><ChevronUp aria-hidden="true" size={15} /></button>
                      <button aria-label={copy.moveImageDown} className="rounded-md border border-[#cdbda9] p-1.5 disabled:opacity-50" disabled={pending || index === images.length - 1} onClick={() => void saveOrder(product, images.map((entry) => String(entry.id)).map((id, itemIndex, all) => itemIndex === index ? all[index + 1] : itemIndex === index + 1 ? all[index] : id))}><ChevronDown aria-hidden="true" size={15} /></button>
                      <button className="rounded-md border border-[#cdbda9] px-2 py-1 text-sm disabled:opacity-50" disabled={pending || index === 0} onClick={() => void saveOrder(product, [String(image.id), ...images.filter((entry) => entry.id !== image.id).map((entry) => String(entry.id))])}>{copy.setPrimaryImage}</button>
                    </div>
                    <button
                      className="mt-3 flex items-center gap-2 rounded-md border border-[#cdbda9] px-3 py-1.5 text-sm"
                      disabled={pending}
                      onClick={async () => {
                        if (submitting.current) return;
                        submitting.current = true;
                        setPending(true);
                        try {
                          await api("/api/admin/retail/media", "DELETE", { imageId: image.id });
                          setResult(await refresh() ? copy.deleted : copy.writeReadback);
                        } catch (error) {
                          setResult(resultError(error, copy.deleteFailed, locale));
                        } finally {
                          submitting.current = false;
                          setPending(false);
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      {copy.deleteImage}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section> : null;
        })}
      </div>
      <button
        className="mt-5 rounded-md border border-[#cdbda9] px-3 py-2 text-sm"
        disabled={pending}
        onClick={async () => {
          if (submitting.current) return;
          submitting.current = true;
          setPending(true);
          try {
            const response = await api("/api/admin/retail/media/outbox", "POST", {});
            setResult(`${copy.outboxProcessed}: ${String(response.processed ?? 0)}`);
          } catch (error) {
            setResult(resultError(error, copy.outboxFailed, locale));
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        {copy.retryOutbox}
      </button>
    </section>
  );
}

export function RetailAuditLog() {
  const [locale, setLocale] = useStoredLocale();
  const copy = getAdminCopy(locale);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const load = useCallback(async (nextPage: number, filters: { action: string; actor: string; date: string }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(nextPage) });
      if (filters.action) query.set("action", filters.action);
      if (filters.actor) query.set("actor", filters.actor);
      if (filters.date) query.set("date", filters.date);
      const response = await api(`/api/admin/retail/audit?${query.toString()}`);
      setEntries((response.entries ?? response.records ?? response.audit ?? []) as Row[]);
      setHasNext(Boolean(response.hasNext ?? response.has_next ?? (Number(response.page ?? nextPage) < Number(response.totalPages ?? response.total_pages ?? nextPage))));
      setPage(Number(response.page ?? nextPage));
      setMessage("");
    } catch (error) {
      setEntries([]);
      setMessage(resultError(error, copy.loadFailed, locale));
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, locale]);

  useEffect(() => { void load(1, { action: "", actor: "", date: "" }); }, [load]);

  return <AdminLocaleContext.Provider value={locale}>
    <AdminShell section="audit" locale={locale} onLocale={setLocale} refresh={() => void load(page, { action, actor, date })}>
      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        <header className="mb-7"><h1 className="noor-title text-3xl">{copy.auditLog}</h1><p className="mt-2 text-sm text-muted">{copy.auditDescription}</p></header>
        <form className="grid gap-3 rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={(event) => { event.preventDefault(); void load(1, { action, actor, date }); }}>
          <label className="text-sm">{copy.filterAction}<input aria-label={copy.filterAction} className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2" value={action} onChange={(event) => setAction(event.target.value)} /></label>
          <label className="text-sm">{copy.filterActor}<input aria-label={copy.filterActor} className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2" value={actor} onChange={(event) => setActor(event.target.value)} /></label>
          <label className="text-sm">{copy.filterDate}<input aria-label={copy.filterDate} className="mt-1 w-full rounded-md border border-[#cdbda9] bg-white p-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <div className="flex items-end gap-2"><button className="rounded-md bg-accent px-3 py-2 text-sm text-white" disabled={loading}>{copy.applyFilters}</button><button type="button" className="rounded-md border border-[#cdbda9] px-3 py-2 text-sm" onClick={() => { setAction(""); setActor(""); setDate(""); void load(1, { action: "", actor: "", date: "" }); }}>{copy.clearFilters}</button></div>
        </form>
        {message && <p className="mt-4 text-sm" role="status">{message}</p>}
        <section className="mt-5 overflow-x-auto rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">{copy.created}</th><th className="p-2">{copy.auditAction}</th><th className="p-2">{copy.actor}</th><th className="p-2">{copy.auditDetail}</th></tr></thead><tbody>{entries.length ? entries.map((entry, index) => <tr className="border-t border-[#e8ded1]" key={String(entry.id ?? index)}><td className="p-2 whitespace-nowrap">{dateTime(entry.created_at ?? entry.at, locale)}</td><td className="p-2">{String(entry.action ?? "—")}</td><td className="p-2">{String(entry.actor_name ?? entry.actor ?? entry.actor_id ?? "—")}</td><td className="max-w-md break-words p-2">{entry.entity_type ? `${String(entry.entity_type)} · ${String(entry.entity_id ?? "—")}` : String(entry.resource_id ?? "—")}</td></tr>) : <tr><td className="p-5 text-muted" colSpan={4}>{loading ? copy.loading : copy.noRecords}</td></tr>}</tbody></table></section>
        <nav className="mt-4 flex items-center justify-between" aria-label={copy.auditLog}><button className="rounded-md border border-[#cdbda9] px-3 py-2 text-sm disabled:opacity-50" disabled={loading || page <= 1} onClick={() => void load(page - 1, { action, actor, date })}>{copy.previousPage}</button><span className="text-sm text-muted">{copy.page} {page}</span><button className="rounded-md border border-[#cdbda9] px-3 py-2 text-sm disabled:opacity-50" disabled={loading || !hasNext} onClick={() => void load(page + 1, { action, actor, date })}>{copy.nextPage}</button></nav>
      </main>
    </AdminShell>
  </AdminLocaleContext.Provider>;
}

export function AdminShell({
  section,
  locale,
  onLocale,
  children,
  refresh,
}: {
  section: RetailAdminSection;
  locale: AdminLocale;
  onLocale: (value: AdminLocale) => void;
  children: ReactNode;
  refresh: () => void;
}) {
  const copy = getAdminCopy(locale);
  const isLegacy = section === "legacy";
  const [actorLabel, setActorLabel] = useState("");

  useEffect(() => {
    let active = true;
    void api("/api/admin/retail/auth/session").then((response) => {
      const actor = response.actor as Row | undefined;
      if (active && actor?.name) setActorLabel(`${String(actor.name)} · ${String(actor.role ?? "")}`);
    }).catch(() => { if (active) setActorLabel(""); });
    return () => { active = false; };
  }, []);

  const nav = (mobile = false) => (
    <nav
      className={mobile ? "flex gap-1 overflow-x-auto px-4 py-2 lg:hidden" : "mt-9 space-y-1"}
      aria-label={copy.retailAdmin}
    >
      {adminNavGroups.map(({ section: item, children }) => {
        const Icon = sectionIcons[item];
        const groupActive = section === item || Boolean(children?.includes(section as never));
        return <div className={mobile ? "contents" : "space-y-1"} key={item}>
          <a
            href={`/admin/retail/${item}`}
            aria-current={section === item ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
              groupActive
                ? "bg-[#eadcc8] font-semibold text-[#5a442d]"
                : "text-[#65584a] hover:bg-[#f1e7da]"
            }`}
          >
            <Icon aria-hidden="true" size={17} />
            <span>{copy[item]}</span>
          </a>
          {children?.map((child) => {
            const href = child === "settlements" ? "/admin/retail/settlements/imports" : `/admin/retail/${child}`;
            return <a
              key={child}
              href={href}
              aria-current={section === child ? "page" : undefined}
              className={`${mobile ? "flex shrink-0 items-center rounded-lg border border-[#dfd2c0] px-3 py-2 text-xs" : "ml-7 block rounded-md px-3 py-1.5 text-xs"} ${section === child ? "font-semibold text-[#5a442d]" : "text-[#7a6b5a] hover:bg-[#f1e7da]"}`}
            >
              {child === "audit" && locale === "zh" ? "操作记录" : child === "audit" ? "Activity log" : child === "system" && locale === "zh" ? "系统健康" : child === "system" ? "System health" : child === "settlements" && locale === "zh" ? "PayPal 对账" : child === "settlements" ? "PayPal reconciliation" : copy[child]}
            </a>;
          })}
        </div>;
      })}
    </nav>
  );

  return (
    <main className="min-h-screen bg-[#f5efe5] text-[#211b16]" lang={locale === "zh" ? "zh-CN" : "en"}>
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {!isLegacy && (
          <aside className="hidden w-64 shrink-0 flex-col border-r border-[#dfd2c0] bg-[#fbf7f1] px-4 py-7 lg:flex">
            <a className="block px-3" href="/admin/retail/overview">
              <span className="font-serif text-2xl">TranquilBeads</span>
              <span className="mt-1 block text-xs uppercase tracking-[.18em] text-[#6b7a51]">{copy.retailAdmin}</span>
            </a>
            {nav()}
            <p className="mt-auto flex items-center gap-2 px-3 pt-10 text-xs text-[#6b7a51]">
              <BadgeCheck aria-hidden="true" size={15} />
              {copy.sandbox} · {copy.retailCatalogue}
            </p>
          </aside>
        )}
        <div className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between border-b border-[#dfd2c0] bg-[#fbf7f1] px-5 sm:px-8">
            <div>
              <a className="font-serif text-xl lg:hidden" href="/admin/retail/overview">TranquilBeads</a>
              <p className="hidden text-xs uppercase tracking-[.15em] text-[#7a6b5a] lg:block">{copy.retailOperations}</p>
            </div>
            <div className="flex items-center gap-2">
              {actorLabel ? <span className="hidden max-w-48 truncate text-xs text-muted sm:inline" title={actorLabel}>{actorLabel}</span> : null}
              <button
                aria-label={copy.refresh}
                className="flex items-center rounded-md border border-[#cdbda9] px-3 py-2 text-sm hover:bg-[#f1e7da]"
                onClick={refresh}
              >
                <RefreshCw aria-hidden="true" size={16} />
                <span className="ml-2 hidden sm:inline">{copy.refresh}</span>
              </button>
              <select
                aria-label={copy.language}
                className="rounded-md border border-[#cdbda9] bg-white px-2 py-2 text-sm"
                value={locale}
                onChange={(event) => onLocale(event.target.value as AdminLocale)}
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
              <button
                aria-label={copy.signOut}
                className="flex items-center rounded-md border border-[#cdbda9] px-3 py-2 text-sm hover:bg-[#f1e7da]"
                onClick={async () => {
                  await api("/api/admin/retail/logout", "POST", {});
                  location.reload();
                }}
              >
                <LogOut aria-hidden="true" size={16} />
                <span className="ml-2 hidden sm:inline">{copy.signOut}</span>
              </button>
            </div>
          </header>
          {!isLegacy && nav(true)}
          {children}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ value }: { value: unknown }) {
  const locale = useAdminLocale();
  const status = String(value ?? "");
  const positive = ["captured", "fulfilled", "published", "reconciled", "ready"].includes(status);
  const negative = ["failed", "denied", "expired", "cancelled", "reversed", "disputed"].includes(status);
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
      positive
        ? "bg-[#e7eddf] text-[#4f633c]"
        : negative
          ? "bg-[#f7dfd9] text-[#8b3d2f]"
          : "bg-[#eee5d8] text-[#6f573b]"
    }`}>
      {statusText(locale, status)}
    </span>
  );
}

function OrderTable({ orders }: { orders: Row[] }) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  return (
    <section className="overflow-hidden rounded-xl border border-[#dfd2c0] bg-[#fbf7f1]">
      <div className="flex items-center justify-between border-b border-[#e4d9ca] px-5 py-4">
        <h2 className="text-lg font-semibold">{copy.orders}</h2>
        <span className="text-sm text-muted">{orders.length} {copy.records}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f4ece1] text-xs uppercase tracking-wide text-[#65584a]">
            <tr>
              {[copy.order, copy.created, copy.customer, copy.payment, copy.fulfillment, copy.total].map((label) => (
                <th className="px-4 py-3" key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length ? orders.map((order) => (
              <tr className="border-t border-[#e8ded1]" key={String(order.id)}>
                <td className="px-4 py-3">
                  <a className="font-medium text-[#6b7a51] hover:underline" href={`/admin/retail/orders/${String(order.id)}`}>
                    #{String(order.id)}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted">{dateTime(order.created_at, locale)}</td>
                <td className="px-4 py-3">{maskedEmail(order.checkout_email)}</td>
                <td className="px-4 py-3"><StatusBadge value={order.status} /></td>
                <td className="px-4 py-3"><StatusBadge value={order.fulfilment_status ?? "unfulfilled"} /></td>
                <td className="px-4 py-3 font-medium">{money(order.amount_minor, order.currency, locale)}</td>
              </tr>
            )) : (
              <tr><td className="px-4 py-8 text-center text-muted" colSpan={6}>{copy.noRecords}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Readiness({ health }: { health: Row | null }) {
  const locale = useAdminLocale();
  const copy = getAdminCopy(locale);
  const cards = [
    [copy.database, health?.database === true],
    [copy.paymentConfiguration, health?.paymentConfigured === true],
    [copy.blobStorage, health?.blobConfigured === true],
    [copy.notifications, health?.notificationsConfigured === true],
  ] as const;

  return (
    <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
      <h2 className="text-lg font-semibold">{copy.environmentReadiness}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, ready]) => (
          <div className="rounded-lg border border-[#e2d6c7] bg-white/60 p-4" key={label}>
            <div className="flex items-center gap-2">
              {ready ? <BadgeCheck className="text-[#6b7a51]" aria-hidden="true" size={18} /> : <CircleAlert className="text-[#a26742]" aria-hidden="true" size={18} />}
              <p className="font-medium">{label}</p>
            </div>
            <p className="mt-2 text-sm text-muted">{ready ? copy.ready : copy.configurationRequired}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-muted">
        {copy.activeShippingZones}: {String(health?.activeShippingZones ?? 0)}
      </p>
    </section>
  );
}

function SettingsGuide({ locale }: { locale: AdminLocale }) {
  const items = locale === "zh" ? [
    { title: "配送与免邮", body: "先用云途只读试算确认服务、时效和成本，再在下方按美元填写顾客运费与满额免邮门槛。", href: "#shipping-zones", action: "配置配送" },
    { title: "PayPal 支付与对账", body: "顾客支付由 PayPal Checkout/Webhook 自动处理；交易和手续费可通过 Reporting API 自动同步。", href: "/admin/retail/settlements/imports", action: "打开 PayPal 对账" },
    { title: "订单邮件与促销", body: "订单邮件、发件人和 Resend 状态在系统健康中检查；订阅者与活动在客户与营销下管理。", href: "/admin/retail/marketing", action: "打开邮件营销" },
    { title: "Agent / MCP 运营", body: "Agent 通过专用机器接口操作，不使用管理员 Cookie；密钥只放在运行环境，所有写入先预览再确认。", href: "/admin/retail/system", action: "检查系统健康" },
  ] : [
    { title: "Shipping & free delivery", body: "Verify YunExpress service, timing, and cost with a read-only quote, then enter customer shipping and the free-shipping threshold in USD below.", href: "#shipping-zones", action: "Configure shipping" },
    { title: "PayPal payment & reconciliation", body: "Checkout and webhooks handle customer payments; the Reporting API can sync transactions and fees for reconciliation.", href: "/admin/retail/settlements/imports", action: "Open PayPal reconciliation" },
    { title: "Order email & campaigns", body: "Check Resend sender readiness in System health. Subscribers and campaigns live under Customers and marketing.", href: "/admin/retail/marketing", action: "Open email marketing" },
    { title: "Agent / MCP operations", body: "Agents use a dedicated machine API, never the admin cookie. Secrets stay in the runtime and every write is previewed before confirmation.", href: "/admin/retail/system", action: "Check system health" },
  ];
  return <section className="mb-6"><div className="mb-4"><h2 className="text-xl font-semibold">{locale === "zh" ? "设置向导" : "Setup guide"}</h2><p className="mt-1 text-sm text-muted">{locale === "zh" ? "按业务目的进入设置，不需要理解数据库字段或技术名词。" : "Start from the business task; no database field knowledge is required."}</p></div><div className="grid gap-4 md:grid-cols-2">{items.map((item) => <article className="rounded-xl border border-[#dfd2c0] bg-white p-5" key={item.title}><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted">{item.body}</p><a className="mt-4 inline-flex rounded-md border border-[#cdbda9] px-3 py-2 text-sm" href={item.href}>{item.action}</a></article>)}</div></section>;
}

function PasswordSecurity({ locale }: { locale: AdminLocale }) {
  const text = locale === "zh" ? {
    title: "修改后台登录密码",
    description: "第一次可使用 Vercel 中的初始密码。修改成功后，新密码保存在后台并覆盖初始密码，今后无需再修改 Vercel 环境变量。",
    current: "当前密码",
    next: "新密码",
    confirm: "再次输入新密码",
    action: "保存新密码",
    pending: "正在保存…",
    mismatch: "两次输入的新密码不一致。",
    invalid: "当前密码不正确。",
    reused: "新密码不能与当前密码相同。",
    failed: "密码修改失败，请稍后重试。",
    success: "密码已修改，所有旧登录会话都已退出。请使用新密码重新登录。",
    signIn: "使用新密码重新登录",
    rule: "至少 8 位。建议使用字母、数字和符号组合。",
  } : {
    title: "Change admin password",
    description: "Use the Vercel password for the first sign-in. After this change, the stored admin password overrides it, so routine password changes no longer require Vercel.",
    current: "Current password",
    next: "New password",
    confirm: "Confirm new password",
    action: "Save new password",
    pending: "Saving…",
    mismatch: "The new passwords do not match.",
    invalid: "The current password is incorrect.",
    reused: "The new password must be different.",
    failed: "Password change failed. Try again.",
    success: "Password changed. All previous admin sessions were signed out. Sign in again with the new password.",
    signIn: "Sign in with the new password",
    rule: "Minimum 8 characters. A mix of letters, numbers, and symbols is recommended.",
  };
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [changed, setChanged] = useState(false);

  return <section className="max-w-2xl rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-6">
    <h2 className="text-xl font-semibold">{text.title}</h2>
    <p className="mt-2 text-sm leading-6 text-muted">{text.description}</p>
    {changed ? <div className="mt-6 rounded-lg border border-[#a9b58e] bg-[#eef2e7] p-4" role="status">
      <p className="text-sm">{text.success}</p>
      <a className="mt-4 inline-flex rounded-md bg-accent px-4 py-2 text-sm text-white" href="/admin/retail/security">{text.signIn}</a>
    </div> : <form className="mt-6 grid gap-4" onSubmit={async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      setMessage("");
      const form = new FormData(formElement);
      const currentPassword = String(form.get("currentPassword") ?? "");
      const newPassword = String(form.get("newPassword") ?? "");
      const confirmPassword = String(form.get("confirmPassword") ?? "");
      if (newPassword !== confirmPassword) { setMessage(text.mismatch); return; }
      setPending(true);
      try {
        const response = await fetch("/api/admin/retail/auth/password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
        });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "request_failed");
        formElement.reset();
        setChanged(true);
      } catch (error) {
        const code = error instanceof Error ? error.message : "request_failed";
        setMessage(code === "current_password_invalid" ? text.invalid : code === "password_reused" ? text.reused : text.failed);
      } finally { setPending(false); }
    }}>
      <label className="text-sm font-medium">{text.current}<input className="mt-1 block w-full rounded-md border border-[#cdbda9] bg-white p-3" name="currentPassword" type="password" autoComplete="current-password" minLength={8} maxLength={256} required /></label>
      <label className="text-sm font-medium">{text.next}<input className="mt-1 block w-full rounded-md border border-[#cdbda9] bg-white p-3" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={256} required /></label>
      <label className="text-sm font-medium">{text.confirm}<input className="mt-1 block w-full rounded-md border border-[#cdbda9] bg-white p-3" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={256} required /></label>
      <p className="text-xs text-muted">{text.rule}</p>
      {message && <p className="text-sm text-red-700" role="alert">{message}</p>}
      <button className="w-fit rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-50" disabled={pending}>{pending ? text.pending : text.action}</button>
    </form>}
  </section>;
}

export function RetailAdminConsole({ section = "legacy" }: { section?: RetailAdminSection }) {
  const [locale, setLocale] = useStoredLocale();
  const copy = getAdminCopy(locale);
  const [products, setProducts] = useState<Row[]>([]);
  const [stock, setStock] = useState<Row[]>([]);
  const [inventoryLedger, setInventoryLedger] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [ledger, setLedger] = useState<Row[]>([]);
  const [shippingZones, setShippingZones] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [health, setHealth] = useState<Row | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      if (section === "system") {
        const response = await fetch("/api/retail/health", { cache: "no-store" });
        setHealth(await response.json());
        setMessage("");
        return true;
      }
      if (section === "security") {
        setMessage("");
        return true;
      }

      const loads = section === "legacy" || section === "overview"
        ? ["products", "inventory", "orders", "customers", "ledger", "shipping"]
        : section === "products" || section === "media"
          ? ["products"]
          : section === "inventory"
            ? ["inventory"]
            : section === "orders"
              ? ["orders"]
              : section === "customers"
                ? ["customers"]
                : section === "finance"
                  ? ["ledger"]
                  : ["shipping"];

      const results = await Promise.all(
        loads.map(async (load) => [load, await api(`/api/admin/retail/${load}`)] as const),
      );
      for (const [load, response] of results) {
        if (load === "products") setProducts((response.products as Row[]) ?? []);
        if (load === "inventory") {
          setStock((response.balances as Row[]) ?? []);
          setInventoryLedger((response.ledger as Row[]) ?? []);
        }
        if (load === "orders") setOrders((response.orders as Row[]) ?? []);
        if (load === "customers") setCustomers((response.customers as Row[]) ?? []);
        if (load === "ledger") {
          setLedger((response.entries as Row[]) ?? []);
          setSummary((response.summary as Row) ?? {});
        }
        if (load === "shipping") setShippingZones((response.zones as Row[]) ?? []);
      }
      setMessage(copy.refreshed);
      return true;
    } catch (error) {
      setMessage(resultError(error, copy.loadFailed, locale));
      return false;
    }
  }, [copy.loadFailed, copy.refreshed, section]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const productForms = (
    <>
      <AdminForm
        titleKey="createProduct"
        fields={["sku", "slug", "titleEn", "titleAr", "titleZh", "descriptionEn", "descriptionAr", "descriptionZh", "amountMinor", "onHand"]}
        submit={(data, idempotencyKey) => api("/api/admin/retail/products", "POST", {
          ...data,
          amountMinor: Number(data.amountMinor),
          onHand: Number(data.onHand),
          status: "draft",
          idempotencyKey,
        })}
        refresh={refresh}
      />
      <AdminForm
        titleKey="editProduct"
        fields={["productId", "slug", "titleEn", "titleAr", "titleZh", "descriptionEn", "descriptionAr", "descriptionZh", "status"]}
        submit={(data, idempotencyKey) => api(`/api/admin/retail/products/${data.productId}`, "PATCH", {
          slug: data.slug || undefined,
          titleEn: data.titleEn || undefined,
          titleAr: data.titleAr || undefined,
          titleZh: data.titleZh,
          descriptionEn: data.descriptionEn || undefined,
          descriptionAr: data.descriptionAr || undefined,
          descriptionZh: data.descriptionZh,
          status: data.status || undefined,
          idempotencyKey,
        })}
        refresh={refresh}
      />
      <AdminForm
        titleKey="changePrice"
        fields={["productId", "amountMinor", "reason"]}
        submit={(data, idempotencyKey) => api(`/api/admin/retail/products/${data.productId}`, "PATCH", {
          action: "price",
          amountMinor: Number(data.amountMinor),
          reason: data.reason,
          idempotencyKey,
        })}
        refresh={refresh}
      />
    </>
  );

  const inventoryView = (
    <>
      <AdminForm
        titleKey="adjustInventory"
        fields={["productId", "delta", "reason"]}
        submit={(data, idempotencyKey) => api("/api/admin/retail/inventory", "POST", {
          ...data,
          delta: Number(data.delta),
          idempotencyKey,
        })}
        refresh={refresh}
      />
      <DataTable titleKey="inventoryBalances" rows={stock} cols={["sku", "on_hand", "reserved", "available"]} />
      <DataTable titleKey="inventoryLedger" rows={inventoryLedger} cols={["sku", "delta_on_hand", "delta_reserved", "reason", "reference_id", "created_at"]} />
    </>
  );

  const customerView = (
    <>
      <CustomerAddressManager customers={customers} refresh={refresh} />
      <DataTable titleKey="customerDirectory" rows={customers} cols={["public_id", "email", "name", "addresses"]} />
    </>
  );

  const financeView = (
    <>
      <AdminForm
        titleKey="reconcileLedger"
        fields={["ledgerId", "status", "note"]}
        submit={(data, idempotencyKey) => api(`/api/admin/retail/ledger/${data.ledgerId}`, "PATCH", {
          status: data.status,
          note: data.note,
          idempotencyKey,
        })}
        refresh={refresh}
      />
      <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{copy.postingTotals}</h2>
          <a className="rounded-md border border-[#cdbda9] px-3 py-2 text-sm" href="/api/admin/retail/ledger/export">
            {copy.exportCsv}
          </a>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            [copy.gross, summary.gross_minor],
            [copy.fee, summary.fee_minor],
            [copy.refund, summary.refund_minor],
            [copy.reversal, summary.reversal_minor],
            [copy.net, summary.net_minor],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-sm text-muted">{String(label)}</dt>
              <dd className="mt-1 text-xl font-semibold">{money(value, "USD", locale)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <DataTable titleKey="paymentLedger" rows={ledger} cols={["id", "paypal_order_id", "kind", "amount_minor", "currency", "reconciliation_status", "paypal_reference"]} />
    </>
  );

  const overviewMetrics: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: copy.orders, value: orders.length, Icon: ShoppingBag },
    {
      label: copy.availableStock,
      value: stock.reduce((total, row) => total + Number(row.available ?? 0), 0),
      Icon: Boxes,
    },
    { label: copy.netPostings, value: money(summary.net_minor, "USD", locale), Icon: ReceiptText },
  ];

  let body: ReactNode;
  switch (section) {
    case "overview":
      body = (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {overviewMetrics.map(({ label, value, Icon }) => (
              <div className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5" key={label}>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Icon aria-hidden="true" size={17} />
                  {label}
                </div>
                <p className="mt-3 text-3xl font-semibold">{String(value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6"><OrderTable orders={orders.slice(0, 8)} /></div>
        </>
      );
      break;
    case "orders":
      body = (
        <div className="space-y-6">
          <OrderTable orders={orders} />
          <AdminForm
            titleKey="fulfilOrder"
            fields={["orderId", "carrier", "tracking", "note"]}
            submit={(data, idempotencyKey) => api(`/api/admin/retail/orders/${data.orderId}`, "PATCH", {
              carrier: data.carrier,
              tracking: data.tracking,
              note: data.note,
              idempotencyKey,
            })}
            refresh={refresh}
          />
          <OrderActions refresh={refresh} />
        </div>
      );
      break;
    case "products":
      body = (
        <div className="space-y-6">
          <section className="grid gap-5 xl:grid-cols-2">{productForms}</section>
          <DataTable titleKey="products" rows={products} cols={["public_id", "sku", "slug", "title_en", "title_ar", "status", "amount_minor", "image_count"]} />
        </div>
      );
      break;
    case "inventory":
      body = <section className="grid gap-5">{inventoryView}</section>;
      break;
    case "customers":
      body = <section className="grid gap-5">{customerView}</section>;
      break;
    case "finance":
      body = <section className="grid gap-5">{financeView}</section>;
      break;
    case "settings":
      body = <><SettingsGuide locale={locale}/><YunExpressProviderPanel locale={locale}/><div className="mt-6" id="shipping-zones"><ShippingZones zones={shippingZones} refresh={refresh} /></div></>;
      break;
    case "security":
      body = <PasswordSecurity locale={locale} />;
      break;
    case "media":
      body = <ProductMedia products={products} refresh={refresh} />;
      break;
    case "system":
      body = <Readiness health={health} />;
      break;
    default:
      body = (
        <div className="grid gap-6">
          <section className="grid gap-5 xl:grid-cols-2">{productForms}</section>
          {inventoryView}
          <AdminForm
            titleKey="fulfilOrder"
            fields={["orderId", "carrier", "tracking", "note"]}
            submit={(data, idempotencyKey) => api(`/api/admin/retail/orders/${data.orderId}`, "PATCH", {
              carrier: data.carrier,
              tracking: data.tracking,
              note: data.note,
              idempotencyKey,
            })}
            refresh={refresh}
          />
          {customerView}
          {financeView}
          <YunExpressProviderPanel locale={locale}/>
          <ShippingZones zones={shippingZones} refresh={refresh} />
          <OrderActions refresh={refresh} />
          <ProductMedia products={products} refresh={refresh} />
          <DataTable titleKey="products" rows={products} cols={["public_id", "sku", "slug", "title_en", "description_en", "title_ar", "description_ar", "status", "amount_minor", "image_count"]} />
        </div>
      );
  }

  return (
    <AdminLocaleContext.Provider value={locale}>
      <AdminShell section={section} locale={locale} onLocale={setLocale} refresh={() => void refresh()}>
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
          <div className="mb-7">
            <h1 className="noor-title text-3xl">{section === "legacy" ? copy.retailOperations : copy[section]}</h1>
            <p className="mt-2 text-sm text-muted">{copy.independentRetail}</p>
          </div>
          {message && <p className="mb-4 text-sm" role="status">{message}</p>}
          {body}
        </div>
      </AdminShell>
    </AdminLocaleContext.Provider>
  );
}

type ActivityEvent = {
  at: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
};

export function RetailOrderDetail({ orderId }: { orderId: string }) {
  const [locale, setLocale] = useStoredLocale();
  const copy = getAdminCopy(locale);
  const [order, setOrder] = useState<Row | null>(null);
  const [ledger, setLedger] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [fullShipping, setFullShipping] = useState<Row | null>(null);
  const [piiPending, setPiiPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [orderResponse, ledgerResponse, productResponse] = await Promise.all([
        api(`/api/admin/retail/orders/${orderId}`),
        api("/api/admin/retail/ledger"),
        api("/api/admin/retail/products"),
      ]);
      const nextOrder = orderResponse.order as Row;
      setOrder(nextOrder);
      setLedger(
        (((ledgerResponse.entries as Row[]) ?? []).filter(
          (entry) => entry.paypal_order_id === nextOrder.paypal_order_id,
        )),
      );
      setProducts((productResponse.products as Row[]) ?? []);
      setMessage("");
      return true;
    } catch (error) {
      setMessage(resultError(error, copy.loadFailed, locale));
      return false;
    }
  }, [copy.loadFailed, orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const items = Array.isArray(order?.order_lines) ? order.order_lines as Row[] : Array.isArray(order?.items_snapshot) ? order.items_snapshot as Row[] : [];
  const shipping = (order?.shipping_snapshot ?? order?.checkout_shipping) as Row | undefined;
  const customer = order?.customer_snapshot as Row | undefined;

  const productImages = useMemo(() => {
    const map = new Map<string, Row>();
    for (const product of products) {
      const images = Array.isArray(product.images) ? product.images as Row[] : [];
      if (images[0]) map.set(String(product.sku), images[0]);
    }
    return map;
  }, [products]);

  const paymentEntries = ledger.filter((entry) => entry.kind === "payment");
  const paymentTotal = paymentEntries
    .reduce((total, entry) => total + Number(entry.amount_minor ?? 0), 0);
  const feeTotal = ledger
    .filter((entry) => entry.kind === "fee")
    .reduce((total, entry) => total + Number(entry.amount_minor ?? 0), 0);
  const refundTotal = Math.abs(
    ledger
      .filter((entry) => entry.kind === "refund")
      .reduce((total, entry) => total + Number(entry.amount_minor ?? 0), 0),
  );
  const netTotal = ledger.reduce((total, entry) => total + Number(entry.amount_minor ?? 0), 0);

  const activity = useMemo(() => {
    if (!order) return [] as ActivityEvent[];
    const events: ActivityEvent[] = [];
    if (order.created_at) {
      events.push({ at: String(order.created_at), label: copy.orderCreated, icon: ReceiptText });
    }
    if (order.captured_at) {
      events.push({
        at: String(order.captured_at),
        label: copy.paymentCaptured,
        detail: money(order.amount_minor, order.currency, locale),
        icon: CreditCard,
      });
    }
    for (const entry of ledger) {
      if (!entry.created_at) continue;
      events.push({
        at: String(entry.created_at),
        label: copy.paymentPosting,
        detail: `${paymentKindText(locale, entry.kind)} · ${money(entry.amount_minor, entry.currency, locale)}`,
        icon: Clock3,
      });
    }
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [copy.orderCreated, copy.paymentCaptured, copy.paymentPosting, ledger, locale, order]);

  const toggleFullShipping = async () => {
    if (fullShipping) {
      setFullShipping(null);
      return;
    }
    setPiiPending(true);
    try {
      const response = await api(`/api/admin/retail/orders/${orderId}?include=pii`);
      const piiOrder = response.order as Row | undefined;
      const pii = piiOrder?.pii as Row | undefined;
      const address = (pii?.shipping ?? response.shipping ?? piiOrder?.shipping_snapshot ?? piiOrder?.checkout_shipping) as Row | undefined;
      if (!address) throw new Error("pii_unavailable");
      setFullShipping(address);
      setMessage("");
    } catch (error) {
      const code = error instanceof Error ? error.message.toLowerCase() : "";
      setMessage(code.includes("unauthorized") || code.includes("forbidden") || code.includes("pii") ? copy.piiUnavailable : resultError(error, copy.piiUnavailable, locale));
    } finally {
      setPiiPending(false);
    }
  };

  return (
    <AdminLocaleContext.Provider value={locale}>
      <AdminShell section="orders" locale={locale} onLocale={setLocale} refresh={() => void refresh()}>
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
          <a className="inline-flex items-center gap-2 text-sm text-[#6b7a51] hover:underline" href="/admin/retail/orders">
            <ArrowLeft aria-hidden="true" size={16} />
            {copy.backToOrders}
          </a>
          {message && <p className="mt-4 text-sm" role="status">{message}</p>}
          {!order && !message && <p className="mt-6 text-sm text-muted">{copy.loading}</p>}
          {order && (
            <>
              <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">{copy.order}</p>
                  <h1 className="noor-title text-4xl">#{String(order.id)}</h1>
                  <p className="mt-2 text-sm text-muted">{dateTime(order.created_at, locale)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge value={order.status} />
                    <StatusBadge value={order.fulfilment_status ?? "unfulfilled"} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <a className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white" href="#refund-order">
                    {copy.confirmRefund}
                  </a>
                  <a className="rounded-lg border border-[#cdbda9] bg-[#fbf7f1] px-4 py-2.5 text-sm" href="/admin/retail/finance">
                    {copy.finance}
                  </a>
                </div>
              </header>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <section className="overflow-hidden rounded-xl border border-[#dfd2c0] bg-[#fbf7f1]">
                    <div className="border-b border-[#e4d9ca] px-5 py-3">
                      <h2 className="text-lg font-semibold">{copy.orderSummary}</h2>
                      <p className="mt-1 text-sm text-muted">{copy.itemSnapshot}</p>
                    </div>
                    <div className="overflow-x-auto px-5 py-3">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="pb-3">{copy.items}</th>
                            <th className="pb-3">{copy.sku}</th>
                            <th className="pb-3">{copy.quantity}</th>
                            <th className="pb-3 text-right">{copy.price}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length ? items.map((item, index) => {
                            const image = productImages.get(String(item.productSku ?? item.sku));
                            return (
                              <tr className="border-t border-[#e8ded1]" key={String(item.variantSku ?? item.sku ?? index)}>
                                <td className="py-2 pr-4">
                                  <div className="flex items-center gap-3">
                                    {image ? (
                                      <div className="w-20 shrink-0">
                                        <Image
                                          unoptimized
                                          className="h-16 w-16 rounded-lg border border-[#e1d5c6] object-cover"
                                          src={String(image.url)}
                                          alt={String(image.alt_en ?? item.titleZh ?? item.titleEn ?? copy.currentCatalogImage)}
                                          width={64}
                                          height={64}
                                        />
                                        <p className="sr-only">{copy.currentCatalogImage}</p>
                                      </div>
                                    ) : (
                                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[#e1d5c6] bg-[#f3ece2]" aria-label={copy.currentCatalogImage}>
                                        <Package aria-hidden="true" size={22} />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium">{String((locale === "zh" ? item.titleZh : item.titleEn) ?? item.titleEn ?? item.titleAr ?? "—")}</p>
                                      {item.titleAr ? <p className="mt-1 text-xs text-muted" dir="rtl">{String(item.titleAr)}</p> : null}
                                      {item.options && typeof item.options === "object" ? <p className="mt-1 text-xs text-muted">{Object.entries(localizeRetailVariantOptions(item.options, locale)).map(([name, value]) => `${name}: ${value}`).join(" · ")}</p> : null}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 pr-4 text-muted">{String(item.productSku ?? item.sku ?? "—")}<br />{String(item.variantSku ?? "—")}</td>
                                <td className="py-2 pr-4">{String(item.quantity ?? 0)}</td>
                                <td className="py-2 text-right font-medium">{money(item.unitAmountMinor, order.currency, locale)}{Number(item.discountMinor ?? 0) > 0 ? <span className="block text-xs text-muted">−{money(item.discountMinor, order.currency, locale)}</span> : null}<span className="block">{money(item.lineTotalMinor ?? Number(item.quantity ?? 0) * Number(item.unitAmountMinor ?? 0) - Number(item.discountMinor ?? 0), order.currency, locale)}</span></td>
                              </tr>
                            );
                          }) : (
                            <tr><td className="py-6 text-muted" colSpan={4}>{copy.noItemSnapshot}</td></tr>
                          )}
                        </tbody>
                      </table>
                      <dl className="ml-auto mt-2 max-w-xs space-y-1 border-t border-[#e8ded1] pt-2 text-sm">
                        {[
                          [copy.subtotal, order.subtotal_minor],
                          [copy.shipping, order.shipping_minor],
                          [copy.tax, order.tax_minor],
                          [copy.discount, order.discount_minor],
                        ].map(([label, value]) => (
                          <div className="flex justify-between" key={String(label)}>
                            <dt>{String(label)}</dt>
                            <dd>{money(value, order.currency, locale)}</dd>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-[#e8ded1] pt-2 font-semibold">
                          <dt>{copy.total}</dt>
                          <dd>{money(order.amount_minor, order.currency, locale)}</dd>
                        </div>
                      </dl>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4">
                    <div className="flex items-center gap-2">
                      <CreditCard aria-hidden="true" size={19} />
                      <h2 className="text-lg font-semibold">{copy.payment}</h2>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <dt className="text-xs text-muted">{copy.paymentProvider}</dt>
                        <dd className="mt-1 font-medium">PayPal</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{copy.captured}</dt>
                        <dd className="mt-1 font-medium">{paymentEntries.length ? money(paymentTotal, order.currency, locale) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{copy.fees}</dt>
                        <dd className="mt-1 font-medium">{ledger.length ? money(feeTotal, order.currency, locale) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{copy.refunded}</dt>
                        <dd className="mt-1 font-medium">{money(ledger.length ? refundTotal : order.refunded_minor, order.currency, locale)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">{copy.net}</dt>
                        <dd className="mt-1 font-medium">{ledger.length ? money(netTotal, order.currency, locale) : "—"}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 break-all text-xs text-muted">{copy.paypalOrder}: {String(order.paypal_order_id ?? "—")}</p>
                  </section>

                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4">
                    <div className="flex items-center gap-2">
                      <Truck aria-hidden="true" size={19} />
                      <h2 className="text-lg font-semibold">{copy.fulfillment}</h2>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3"><StatusBadge value={order.fulfilment_status ?? "unfulfilled"} /></div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div><dt className="text-xs text-muted">{copy.carrier}</dt><dd className="mt-1">{String(order.carrier ?? "—")}</dd></div>
                      <div><dt className="text-xs text-muted">{copy.tracking}</dt><dd className="mt-1 break-all">{String(order.tracking_number ?? "—")}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-xs text-muted">{copy.note}</dt><dd className="mt-1">{String(order.admin_note ?? "—")}</dd></div>
                    </dl>
                  </section>

                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4">
                    <div className="flex items-center gap-2">
                      <Clock3 aria-hidden="true" size={19} />
                      <h2 className="text-lg font-semibold">{copy.activity}</h2>
                    </div>
                    <ol className="mt-3 space-y-2">
                      {activity.length ? activity.map((event, index) => {
                        const Icon = event.icon;
                        return (
                          <li className="grid grid-cols-[auto_1fr] gap-3" key={`${event.at}-${index}`}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ded2c2] bg-[#f4ece1]">
                              <Icon aria-hidden="true" size={15} />
                            </span>
                            <div>
                              <p className="font-medium">{event.label}</p>
                              {event.detail ? <p className="mt-1 text-sm text-muted">{event.detail}</p> : null}
                              <time className="mt-1 block text-xs text-muted">{dateTime(event.at, locale)}</time>
                            </div>
                          </li>
                        );
                      }) : <li className="text-sm text-muted">{copy.noActivity}</li>}
                    </ol>
                  </section>

                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
                    <h2 className="text-lg font-semibold">{copy.orderActions}</h2>
                    <p className="mt-2 text-sm text-muted">{copy.orderActionsHelp}</p>
                    <div className="mt-5"><OrderActions refresh={refresh} defaultOrderId={String(order.id)} embedded /></div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4">
                    <div className="flex items-center gap-2"><Users aria-hidden="true" size={18} /><h2 className="text-lg font-semibold">{copy.customer}</h2></div>
                    <p className="mt-3 text-sm text-muted">{copy.checkoutSnapshotMasked}</p>
                    <p className="mt-4 font-medium">{maskedName(customer?.name ?? shipping?.recipient)}</p>
                    <p className="mt-1 text-sm text-muted">{maskedEmail(order.checkout_email ?? customer?.email)}</p>
                  </section>
                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-4">
                    <div className="flex items-center gap-2"><MapPin aria-hidden="true" size={18} /><h2 className="text-lg font-semibold">{copy.delivery}</h2></div>
                    {fullShipping ? (
                      <address className="mt-4 not-italic text-sm">
                        {[fullShipping.recipient, fullShipping.line1 ?? fullShipping.line_1, fullShipping.line2 ?? fullShipping.line_2, fullShipping.city, fullShipping.region, fullShipping.postal_code ?? fullShipping.postalCode, fullShipping.country, fullShipping.phone]
                          .filter(Boolean)
                          .map((line, index) => <span className="block" key={`${String(line)}-${index}`}>{String(line)}</span>)}
                      </address>
                    ) : <p className="mt-4 whitespace-pre-line text-sm">{maskedAddress(shipping)}</p>}
                    <p className="mt-2 text-xs text-muted">{fullShipping ? "" : copy.maskedDefault}</p>
                    <button aria-label={fullShipping ? copy.hideFullAddress : copy.showFullAddress} className="mt-3 flex items-center gap-2 rounded-md border border-[#cdbda9] px-3 py-1.5 text-sm" disabled={piiPending} onClick={() => void toggleFullShipping()}>{fullShipping ? <EyeOff aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}{piiPending ? copy.working : fullShipping ? copy.hideFullAddress : copy.showFullAddress}</button>
                  </section>
                  <section className="rounded-xl border border-[#dfd2c0] bg-[#fbf7f1] p-5">
                    <div className="flex items-center gap-2"><PackageCheck aria-hidden="true" size={18} /><h2 className="text-lg font-semibold">{copy.deliveryMethod}</h2></div>
                    <p className="mt-4 text-sm">{shippingMethodText(locale, order.shipping_method)}</p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </AdminShell>
    </AdminLocaleContext.Provider>
  );
}
