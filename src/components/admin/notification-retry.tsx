"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function NotificationRetry({jobs}:{jobs:{id:string;type:string}[]}) {
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 if(!jobs.length)return null;
 return <form className="mb-6 grid gap-3 rounded-2xl border border-brand-border bg-white p-5" onSubmit={async event=>{
  event.preventDefault();if(busy)return;setBusy(true);setMessage("");const data=new FormData(event.currentTarget);
  try {const res=await fetch("/api/admin/notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job:data.get("job"),reason:data.get("reason"),acknowledge_ambiguous:data.get("ack")==="on"})});const result=await res.json();setMessage(res.ok?"Retry queued. Delivery is not yet confirmed.":result.error);if(res.ok)router.refresh();}catch{setMessage("Retry unavailable.");}finally{setBusy(false);}
 }}>
 <h2 className="font-semibold">Request a controlled retry</h2>
 <label>Failed notification<select name="job" className="block w-full rounded-lg border p-2" required>{jobs.map(j=><option key={j.id} value={j.id}>{j.type} — {j.id}</option>)}</select></label>
 <label>Reason<input name="reason" minLength={5} maxLength={500} required className="block w-full rounded-lg border p-2" /></label>
 <label className="flex gap-2"><input name="ack" type="checkbox"/>I checked the mailbox for uncertain delivery and confirmed a resend is appropriate.</label>
 <button disabled={busy} className="w-fit rounded-xl bg-brand-purple px-4 py-2 font-semibold disabled:opacity-50">{busy?"Queuing…":"Queue retry"}</button>
 <p role="status">{message}</p>
 </form>;
}
