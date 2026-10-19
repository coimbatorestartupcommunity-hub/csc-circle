import Link from "next/link";
import { Container } from "@/components/common/container";
export const metadata = { title: "Access denied", robots: { index: false, follow: false } };
export default function Page() {
  return <Container className="py-20 text-center"><h1 className="text-3xl font-bold">Access unavailable</h1><p className="my-5 text-brand-secondary">This account does not have access to the requested CSC resource. Contact the community team for help.</p><Link href="/" className="underline">Back to CSC Circle</Link></Container>;
}
