import { redirect } from "next/navigation";

export default function PendingStartupRevisionsPage() {
  redirect("/admin/startups?view=revisions");
}
