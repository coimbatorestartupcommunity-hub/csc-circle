import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import {
  communityDataFilterSchema,
  type CommunityDataFilter,
} from "@/lib/community-data/schema";
import {
  getCommunityDashboardData,
  type CommunityDataSummary,
  type CommunityMemberPage,
} from "@/lib/community-data/service";
import { CommunityDataDashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Community Member Data",
  robots: { index: false, follow: false, noarchive: true },
};

const emptyPage: CommunityMemberPage = { rows: [], total: 0, page: 1, pageSize: 25 };
const emptySummary: CommunityDataSummary = {
  total: 0,
  establishedBusiness: 0,
  startupFounder: 0,
  ideaStage: 0,
};

export default async function CommunityDataPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAdminPagePermission("members.read");
  const incoming = await searchParams;
  const parsed = communityDataFilterSchema.safeParse({
    category: typeof incoming.category === "string" && incoming.category ? incoming.category : undefined,
    search: typeof incoming.search === "string" && incoming.search ? incoming.search : undefined,
    city: typeof incoming.city === "string" && incoming.city ? incoming.city : undefined,
    industry: typeof incoming.industry === "string" && incoming.industry ? incoming.industry : undefined,
    stage: typeof incoming.stage === "string" && incoming.stage ? incoming.stage : undefined,
    support: typeof incoming.support === "string" && incoming.support ? incoming.support : undefined,
    from: typeof incoming.from === "string" && incoming.from ? incoming.from : undefined,
    to: typeof incoming.to === "string" && incoming.to ? incoming.to : undefined,
    sort: typeof incoming.sort === "string" ? incoming.sort : undefined,
    page: typeof incoming.page === "string" ? incoming.page : undefined,
    pageSize: typeof incoming.pageSize === "string" ? incoming.pageSize : undefined,
  });
  const filter: CommunityDataFilter = parsed.success
    ? parsed.data
    : { sort: "newest", page: 1, pageSize: 25 };

  let data: { page: CommunityMemberPage; summary: CommunityDataSummary } = {
    page: { ...emptyPage, pageSize: filter.pageSize },
    summary: emptySummary,
  };
  let unavailable = false;
  if (context.mode === "live") {
    try {
      data = await getCommunityDashboardData(filter);
    } catch {
      unavailable = true;
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Community Member Data"
        description="View, search, filter, and export information collected through the CSC Circle member onboarding survey."
        isDemo={context.mode === "preview"}
      />
      {unavailable ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Community data is temporarily unavailable.</p>
            <p className="mt-1 text-sm">No survey records were returned. Please retry or contact the CSC technical administrator.</p>
          </div>
        </div>
      ) : (
        <CommunityDataDashboard
          initialFilter={filter}
          page={data.page}
          summary={data.summary}
          canExport={context.mode === "live"}
        />
      )}
    </>
  );
}
