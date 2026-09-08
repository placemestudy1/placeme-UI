import type { ConsentDisclosure } from "@/lib/consent-disclosures";

// Renders the real consent disclosure list (SPEC-0012 R2/AC2) as a titled
// icon/body list, shared between the web and native consent pages.
export function DisclosureList({ items }: { items: ConsentDisclosure[] }) {
  return (
    <ul className="space-y-4">
      {items.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-primary-glow">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
