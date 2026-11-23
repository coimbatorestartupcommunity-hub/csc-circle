import { getSupabase } from "../services/live-queries.js";

async function analyze() {
  const sb = getSupabase();

  // 1. Check membership claims
  const { data: claims, error: claimsErr } = await sb
    .from("membership_claims")
    .select("id, user_id, linked_account_email, whatsapp, status, reference, full_name");

  console.log("Total membership claims in DB:", claims?.length, "Error:", claimsErr?.message);
  
  // What are the distinct statuses?
  const statuses = new Set(claims?.map(c => c.status));
  console.log("Distinct claim statuses:", Array.from(statuses));

  const approvedClaims = claims?.filter((c) => c.status === "active" || c.status === "approved" || c.reference) || [];
  console.log("Approved/Claimed count:", approvedClaims.length);

  // 2. Check profiles
  const { data: profiles, error: profErr } = await sb
    .from("profiles")
    .select("id, email, full_name, whatsapp");
  console.log("Total profiles:", profiles?.length);

  // 3. Check auth users count via admin
  const { data: { users }, error: usersErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  console.log("Total auth users:", users?.length);

  // Map users who have claimed
  const claimedUserIds = new Set(approvedClaims.map((c) => c.user_id).filter(Boolean));
  const claimedEmails = new Set(approvedClaims.map((c) => c.linked_account_email?.toLowerCase().trim()).filter(Boolean));

  const stalledUsers = (users || []).filter((u) => {
    const email = u.email?.toLowerCase().trim();
    return !claimedUserIds.has(u.id) && (!email || !claimedEmails.has(email));
  });

  console.log("Stalled users count (registered/logged in but NO claimed membership):", stalledUsers.length);
  
  const stalledWithPhone = stalledUsers.filter((u) => {
    const prof = profiles?.find((p) => p.id === u.id);
    return u.phone || u.user_metadata?.phone || u.user_metadata?.whatsapp || prof?.whatsapp;
  });
  console.log("Stalled users with phone numbers available:", stalledWithPhone.length);

  const claimedWithPhone = approvedClaims.filter((c) => c.whatsapp || profiles?.find((p) => p.id === c.user_id)?.whatsapp);
  console.log("Claimed users with phone numbers:", claimedWithPhone.length);

  process.exit(0);
}

analyze();
