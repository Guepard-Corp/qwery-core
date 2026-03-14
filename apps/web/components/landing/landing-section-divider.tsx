type LandingSectionDividerProps = {
  label: string;
};

export function LandingSectionDivider({ label }: LandingSectionDividerProps) {
  return (
    <div className="relative my-12">
      <div className="absolute inset-0 flex items-center">
        <div className="border-border/40 w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background text-muted-foreground/70 px-3">
          {label}
        </span>
      </div>
    </div>
  );
}
