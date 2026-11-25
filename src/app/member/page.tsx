import { redirect } from "next/navigation";

export default function MemberPageRedirect() {
  redirect("/profile");
}
