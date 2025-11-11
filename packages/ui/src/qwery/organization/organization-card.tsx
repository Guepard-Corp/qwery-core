import { Card, CardContent } from '../../shadcn/card';

interface OrganizationCardProps {
  id: string;
  name: string;
  onClick: () => void;
}

export function OrganizationCard({ id, name, onClick }: OrganizationCardProps) {
  return (
    <Card
      key={id}
      className="hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={onClick}
      data-test={`organization-card-${id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
            <svg
              className="text-foreground h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 truncate text-base font-semibold">{name}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
