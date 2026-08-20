type PlaceholderPageProps = {
  title: string;
  note?: string;
};

export function PlaceholderPage({ title, note }: PlaceholderPageProps) {
  return (
    <div className="placeholder-page page-pad">
      <div className="page-inner">
        <p className="type-eyebrow">{title}</p>
        {note ? <p className="type-legal">{note}</p> : null}
      </div>
    </div>
  );
}
