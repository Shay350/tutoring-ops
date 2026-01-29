import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = {
  params: { slug: string[] };
};

export default function TutorPlaceholder({ params }: PageProps) {
  const section = params.slug.join(" / ");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Tutor</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900 capitalize">
            {section}
          </h1>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Section coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This area will include schedules, logs, and resources for {section}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
