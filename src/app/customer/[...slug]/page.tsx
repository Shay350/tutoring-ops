import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = {
  params: { slug: string[] };
};

export default function CustomerPlaceholder({ params }: PageProps) {
  const section = params.slug.join(" / ");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900 capitalize">
          {section}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Section coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This area will include ops-first tables and updates for {section}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
