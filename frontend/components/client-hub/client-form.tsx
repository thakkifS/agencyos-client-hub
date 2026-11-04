"use client";

import { useMemo, useState } from "react";
import { getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export type ClientFormValues = {
  name: string;
  primaryContactName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  website: string | null;
};

type InitialClient = Partial<ClientFormValues>;
type ClientFormProps = {
  initial?: InitialClient;
  submitLabel: string;
  busyLabel?: string;
  serverError?: string;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onCancel?: () => void;
};

const contactNamePattern = /^(?=.*\p{L})[\p{L}\p{M} .'-]+$/u;

export function ClientForm({ initial, submitLabel, busyLabel = "Saving…", serverError, onSubmit, onCancel }: ClientFormProps) {
  const countryNames = useMemo(() => new Intl.DisplayNames(["en"], { type: "region" }), []);
  const countries = useMemo(() => getCountries().map((country) => ({ country, name: countryNames.of(country) ?? country, callingCode: getCountryCallingCode(country) })).sort((a, b) => a.name.localeCompare(b.name)), [countryNames]);
  const [name, setName] = useState(initial?.name ?? "");
  const [contact, setContact] = useState(initial?.primaryContactName ?? "");
  const [email, setEmail] = useState(initial?.primaryEmail ?? "");
  const [country, setCountry] = useState(() => initial?.primaryPhone ? parsePhoneNumberFromString(initial.primaryPhone)?.country ?? "LK" : "LK");
  const [phone, setPhone] = useState(() => {
    const parsed = initial?.primaryPhone ? parsePhoneNumberFromString(initial.primaryPhone) : undefined;
    return parsed?.nationalNumber ?? initial?.primaryPhone ?? "";
  });
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const cleanName = name.trim();
    const cleanContact = contact.trim();
    const cleanEmail = email.trim().toLowerCase();
    let cleanPhone: string | null = null;
    let cleanWebsite = website.trim();

    if (cleanName.length < 2) next.name = "Company name must be at least 2 characters.";
    else if (cleanName.length > 150) next.name = "Company name cannot exceed 150 characters.";
    if (cleanContact.length < 2) next.contact = "Primary contact must be at least 2 characters.";
    else if (cleanContact.length > 100) next.contact = "Primary contact cannot exceed 100 characters.";
    else if (!contactNamePattern.test(cleanContact)) next.contact = "Use letters, spaces, initials, dots, apostrophes or hyphens.";
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) next.email = "Enter a valid email address.";
    if (phone.trim()) {
    const parsed = parsePhoneNumberFromString(phone.trim(), country as CountryCode);
    const digitCount = parsed?.number.replace(/\D/g, "").length ?? 0;
      if (!parsed || !isValidPhoneNumber(phone.trim(), country as CountryCode) || digitCount < 7 || digitCount > 15) next.phone = "Enter a valid phone number for the selected country (7–15 digits).";
      else cleanPhone = parsed.number;
    }
    if (cleanWebsite.toLowerCase().startsWith("www.")) cleanWebsite = `https://${cleanWebsite}`;
    if (cleanWebsite) {
      try {
        const parsed = new URL(cleanWebsite);
        if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) throw new Error();
      } catch { next.website = "Enter a valid http:// or https:// website URL."; }
    }
    if (!cleanEmail && !cleanPhone && !cleanWebsite) next.contactMethod = "Provide at least one contact method: email, phone or website.";

    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit({ name: cleanName, primaryContactName: cleanContact, primaryEmail: cleanEmail || null, primaryPhone: cleanPhone, website: cleanWebsite || null });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Could not save client details." });
    } finally { setSaving(false); }
  }

  const fieldClass = "mt-1 block h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
  const message = (key: string) => errors[key] ? <p id={`client-${key}-error`} className="mt-1 text-xs text-[var(--error)]">{errors[key]}</p> : null;
  return <form noValidate onSubmit={submit} className="grid gap-4 rounded-lg border border-[var(--border)] bg-white p-4 sm:grid-cols-2 sm:p-5">
    <div className="sm:col-span-2"><h2 className="text-sm font-semibold">Client contact details</h2><p className="mt-1 text-xs text-[var(--secondary)]">Enter a company and primary contact. At least one contact method is required.</p></div>
    {errors.form && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--error)] sm:col-span-2">{errors.form}</p>}
    {serverError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-[var(--error)] sm:col-span-2">{serverError}</p>}
    {errors.contactMethod && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">{errors.contactMethod}</p>}
    <label className="text-xs font-medium">Company name <span className="text-[var(--error)]">*</span><input required minLength={2} maxLength={150} autoComplete="organization" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "client-name-error" : undefined} className={fieldClass} placeholder="Company name"/>{message("name")}</label>
    <label className="text-xs font-medium">Primary contact <span className="text-[var(--error)]">*</span><input required minLength={2} maxLength={100} autoComplete="name" value={contact} onChange={(e) => setContact(e.target.value)} aria-invalid={Boolean(errors.contact)} aria-describedby={errors.contact ? "client-contact-error" : undefined} className={fieldClass} placeholder="A. Mohamed"/>{message("contact")}</label>
    <label className="text-xs font-medium">Email<input type="email" maxLength={320} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "client-email-error" : undefined} className={fieldClass} placeholder="name@company.com"/>{message("email")}</label>
    <fieldset className="min-w-0"><legend className="text-xs font-medium">Phone</legend><div className="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2"><label className="sr-only" htmlFor="client-phone-country">Country selection</label><select id="client-phone-country" value={country} onChange={(e) => setCountry(e.target.value as CountryCode)} className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><option value="">Select country</option>{countries.map((item) => <option key={item.country} value={item.country}>{item.name} (+{item.callingCode})</option>)}</select><label className="sr-only" htmlFor="client-phone-number">Phone number</label><input id="client-phone-number" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "client-phone-error" : undefined} className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" placeholder="Phone number"/></div>{message("phone")}</fieldset>
    <label className="text-xs font-medium sm:col-span-2">Website <span className="font-normal text-[var(--secondary)]">(optional)</span><input type="url" maxLength={2048} autoComplete="url" value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={() => { if (website.trim().toLowerCase().startsWith("www.")) setWebsite(`https://${website.trim()}`); }} aria-invalid={Boolean(errors.website)} aria-describedby={errors.website ? "client-website-error" : undefined} className={fieldClass} placeholder="https://company.com or www.company.lk"/>{message("website")}</label>
    <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">{onCancel && <button type="button" onClick={onCancel} className="rounded-md border border-slate-200 px-4 py-2 text-xs font-medium hover:bg-slate-50">Cancel</button>}<button disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{saving ? busyLabel : submitLabel}</button></div>
  </form>;
}
