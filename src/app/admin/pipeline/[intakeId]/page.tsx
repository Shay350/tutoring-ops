import { OperationalIntakeDetailPage } from "@/app/manager/pipeline/[intakeId]/page";

type PageProps = {
  params: { intakeId: string } | Promise<{ intakeId: string }>;
};

export default async function AdminIntakeDetailPage({ params }: PageProps) {
  return (
    <OperationalIntakeDetailPage
      params={params}
      audienceLabel="Admin"
      basePath="/admin"
      testId="admin-pipeline-detail-entry"
    />
  );
}
