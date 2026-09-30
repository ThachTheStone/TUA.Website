/** Title block at the top of every public page except the home and product pages; actions sit on the right. */
export function PageHeader({ title, description, children }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{title}</h1>
        {description && <div className="text-muted-foreground">{description}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}
