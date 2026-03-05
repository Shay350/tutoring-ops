import { OperationalPipelinePage } from "@/app/manager/pipeline/page";

type SearchParams = { q?: string };
type PageProps = { searchParams?: SearchParams | Promise<SearchParams> };

export default async function AdminPipelinePage({ searchParams }: PageProps) {
  return (
    <OperationalPipelinePage
      searchParams={searchParams}
      audienceLabel="Admin"
      basePath="/admin"
      testId="admin-pipeline-entry"
    />
  );
}
