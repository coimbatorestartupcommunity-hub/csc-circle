"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PreviewRow = { rowNumber: number; fullName: string; email: string; amountPaid: number | null; attendeeCount: number; status: "new" | "update" | "invalid"; errors: string[] };

export function GoogleFormImport({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [csv, setCsv] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const endpoint = `/api/admin/events/${eventId}/import-registrations`;

  async function send(action: "preview" | "commit" | "approve_all") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, csv }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setMessage(result.error ?? "The request could not be completed."); return; }
      if (action === "preview") setRows(result.rows as PreviewRow[]);
      else if (action === "commit") { setRows([]); setCsv(""); setFileName(""); setMessage(`Processed ${result.processed} valid row${result.processed === 1 ? "" : "s"}: ${result.imported} added and ${result.updated} updated.${result.invalid ? ` ${result.invalid} invalid row${result.invalid === 1 ? " was" : "s were"} not imported.` : ""}`); router.refresh(); }
      else { setMessage(`Approved ${result.approved} of ${result.total} imported registrations. Pass emails are queued.`); router.refresh(); }
    } catch { setMessage("The request could not be completed. Try again."); }
    finally { setBusy(false); }
  }

  async function selectFile(file?: File) {
    setRows([]); setCsv(""); setMessage("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !/\.csv$/i.test(file.name)) { setMessage("Choose a CSV file under 5 MB."); return; }
    try { setCsv(await file.text()); setFileName(file.name); }
    catch { setMessage("The CSV file could not be read."); }
  }

  return <section className="grid gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border" aria-label="Import event registrations">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold text-brand-ink">Import registrations (CSV)</h2><p className="mt-1 text-sm text-brand-muted">Upload Google Form responses, then add new rows and merge updated responses into this event.</p></div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { if (window.confirm("Approve every pending imported registration? This confirms payment and queues each attendee pass email.")) void send("approve_all"); }}>Approve all imported</Button>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1.5 text-sm text-brand-secondary">Google Form CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void selectFile(event.target.files?.[0])} className="max-w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm" /></label>
      {fileName && <span className="pb-2 text-sm text-brand-muted">{fileName}</span>}
      <Button type="button" variant="outline" disabled={busy || !csv} onClick={() => void send("preview")}>{busy ? "Working…" : "Preview CSV"}</Button>
      {rows.some((row) => row.status !== "invalid") && <Button type="button" disabled={busy} onClick={() => { if (window.confirm("Process every valid row shown in the preview? Existing event registrations will be updated with the Google Form payment data.")) void send("commit"); }}>Import all valid rows</Button>}
    </div>
    {message && <p role="status" className="text-sm text-brand-secondary">{message}</p>}
    {rows.length > 0 && <div className="overflow-x-auto rounded-xl border border-brand-border"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-brand-cloud text-brand-muted"><tr>{["Row", "Name", "Email", "Attendees", "Amount", "Review"].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber} className="border-t border-brand-border"><td className="px-3 py-2">{row.rowNumber}</td><td className="px-3 py-2">{row.fullName || "—"}</td><td className="px-3 py-2">{row.email || "—"}</td><td className="px-3 py-2">{row.attendeeCount || "—"}</td><td className="px-3 py-2">{row.amountPaid === null ? "—" : `₹${row.amountPaid}`}</td><td className="px-3 py-2"><span className={row.status === "new" ? "text-emerald-700" : row.status === "update" ? "text-amber-700" : "text-red-700"}>{row.status === "new" ? "add" : row.status === "update" ? "update existing" : "invalid"}{row.errors.length ? `: ${row.errors.join(" ")}` : ""}</span></td></tr>)}</tbody></table></div>}
  </section>;
}
