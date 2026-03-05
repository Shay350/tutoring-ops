import { OperationalStudentsPage } from "@/app/manager/students/page";

import { updateAtRiskStatusAdmin } from "./actions";

type SearchParams = { risk?: string | string[] };
type PageProps = { searchParams?: SearchParams | Promise<SearchParams> };

export default async function AdminStudentsPage({ searchParams }: PageProps) {
  return (
    <OperationalStudentsPage
      searchParams={searchParams}
      audienceLabel="Admin"
      basePath="/admin"
      updateAction={updateAtRiskStatusAdmin}
      testId="admin-students-entry"
    />
  );
}
