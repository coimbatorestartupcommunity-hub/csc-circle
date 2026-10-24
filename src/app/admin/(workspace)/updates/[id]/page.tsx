import { redirect } from "next/navigation";
export default async function UpdateAdminRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/updates/${id}/edit`);
}
