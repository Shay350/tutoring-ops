import { OperationalStudentDetailPage } from "@/app/manager/students/[studentId]/page";

type PageProps = {
  params: { studentId: string };
};

export default async function AdminStudentDetailPage({ params }: PageProps) {
  return (
    <OperationalStudentDetailPage
      params={params}
      audienceLabel="Admin"
      basePath="/admin"
      testId="admin-student-detail-entry"
    />
  );
}
