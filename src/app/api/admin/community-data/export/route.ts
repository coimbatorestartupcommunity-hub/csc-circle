import { getAdminContext, can } from "@/lib/admin/gate";
import { communityDataCsv } from "@/lib/community-data/csv-export";
import { createCommunityDataPdf, CommunityDataPdfFontError } from "@/lib/community-data/pdf-export";
import { communityDataFilterSchema } from "@/lib/community-data/schema";
import {
  CommunityDataAccessError,
  CommunityDataExportLimitError,
  getCommunityExportRows,
} from "@/lib/community-data/service";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { createSubmissionClient } from "@/lib/supabase/submissions";

const MAX_EXPORT_BYTES = 4 * 1024 * 1024;
const MAX_PDF_TEXT_CHARACTERS = 250_000;

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "members.read")) {
    return new Response(null, { status: 404, headers: privateHeaders });
  }

  const rateLimitClient = createSubmissionClient();
  if (!rateLimitClient) {
    return Response.json({ error: "The export service is temporarily unavailable." }, { status: 503, headers: privateHeaders });
  }
  const limited = await distributedRateLimit(
    rateLimitClient,
    "community-data-export",
    `${context.userId}:${clientIp(request)}`,
    10,
    5 * 60_000,
  );
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many reports were requested. Please wait and try again." },
      { status: 429, headers: { ...privateHeaders, "Retry-After": String(limited.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  if (format !== "csv" && format !== "pdf") {
    return Response.json({ error: "Choose CSV or PDF export format." }, { status: 400, headers: privateHeaders });
  }

  const parsed = communityDataFilterSchema.safeParse({
    category: url.searchParams.get("category") || undefined,
    search: url.searchParams.get("search") || undefined,
    city: url.searchParams.get("city") || undefined,
    industry: url.searchParams.get("industry") || undefined,
    stage: url.searchParams.get("stage") || undefined,
    support: url.searchParams.get("support") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    sort: url.searchParams.get("sort") || undefined,
    page: 1,
    pageSize: 25,
  });
  if (!parsed.success) {
    return Response.json({ error: "The export filters are invalid." }, { status: 400, headers: privateHeaders });
  }

  const date = new Date().toISOString().slice(0, 10);
  try {
    const maximum = format === "pdf" ? 500 : 10_000;
    const result = await getCommunityExportRows(parsed.data, maximum);
    if (format === "csv") {
      const csv = communityDataCsv(result.rows);
      if (new TextEncoder().encode(csv).byteLength > MAX_EXPORT_BYTES) {
        return Response.json(
          { error: "This CSV is too large for a direct download. Narrow the active filters and try again." },
          { status: 413, headers: privateHeaders },
        );
      }
      return new Response(csv, {
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="CSC_Community_Member_Data_${date}.csv"`,
        },
      });
    }

    const textCharacters = result.rows.reduce((total, row) => total
      + row.full_name.length
      + row.contact_number.length
      + row.email.length
      + (row.city?.length ?? 0)
      + row.member_category.length
      + row.business_or_idea_name.length
      + (row.industry_sector?.length ?? 0)
      + (row.industry_other?.length ?? 0)
      + (row.current_stage?.length ?? 0)
      + row.description.length
      + (row.support_needed?.join("; ").length ?? 0)
      + (row.support_needed_other?.length ?? 0)
      + (row.biggest_challenge?.length ?? 0)
      + (row.website_url?.length ?? 0)
      + (row.discovery_source?.length ?? 0)
      + (row.discovery_source_other?.length ?? 0)
      + (row.preferred_contact_method?.length ?? 0)
      + String(row.established_year ?? "").length
      + (row.business_team_size?.length ?? 0)
      + (row.business_connections?.join("; ").length ?? 0)
      + (row.business_connections_other?.length ?? 0)
      + (row.startup_team_structure?.length ?? 0)
      + (row.startup_support?.join("; ").length ?? 0)
      + (row.startup_support_other?.length ?? 0)
      + (row.startup_current_focus?.length ?? 0)
      + (row.seeking_cofounder?.length ?? 0)
      + (row.idea_support?.join("; ").length ?? 0)
      + (row.idea_support_other?.length ?? 0)
      + (row.idea_problem_statement?.length ?? 0), 0);
    if (textCharacters > MAX_PDF_TEXT_CHARACTERS) {
      return Response.json(
        { error: "This PDF contains too much text for a direct report. Narrow the active filters and try again." },
        { status: 413, headers: privateHeaders },
      );
    }
    const bytes = await createCommunityDataPdf(result.rows, parsed.data, result.total);
    if (bytes.byteLength > MAX_EXPORT_BYTES) {
      return Response.json(
        { error: "This PDF is too large for a direct download. Narrow the active filters and try again." },
        { status: 413, headers: privateHeaders },
      );
    }
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="CSC_Community_Member_Report_${date}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof CommunityDataAccessError) {
      return new Response(null, { status: 404, headers: privateHeaders });
    }
    if (error instanceof CommunityDataExportLimitError) {
      return Response.json(
        { error: `This export is limited to ${error.maximum} records. Narrow the active filters and try again.` },
        { status: 413, headers: privateHeaders },
      );
    }
    if (error instanceof CommunityDataPdfFontError) {
      return Response.json(
        { error: "The PDF font cannot render one or more submitted characters. Use CSV to preserve the complete Unicode text." },
        { status: 422, headers: privateHeaders },
      );
    }
    console.error("CSC_COMMUNITY_DATA_EXPORT_FAILED");
    return Response.json({ error: "The report could not be generated. Please try again." }, { status: 503, headers: privateHeaders });
  }
}
