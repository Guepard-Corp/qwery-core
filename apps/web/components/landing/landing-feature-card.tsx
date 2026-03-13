import type { LucideIcon } from 'lucide-react';

type LandingFeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function LandingFeatureCard({
  icon: Icon,
  title,
  description,
}: LandingFeatureCardProps) {
  return (
    <div className="group bg-card hover:border-border rounded-2xl border border-transparent p-8 transition-all hover:shadow-lg">
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg border transition-all group-hover:bg-[#ffcb51]/10">
          <Icon className="text-muted-foreground size-5 transition-colors group-hover:text-[#ffcb51]" />
        </div>
        <h3 className="text-foreground text-lg font-bold tracking-tight">
          {title}
        </h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
