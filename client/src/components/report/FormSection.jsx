// A numbered section of the weekly form (design §4.1): mono number at --mut, Chivo 700
// 20px, a 1px --hair rule beneath; 20px between fields. The section is the rail's anchor
// (its `id`), and `scroll-margin-top` puts it 140px under the top when jumped to.

export function FormSection({ id, number, title, optional = false, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-[140px]"
    >
      <div className="flex items-baseline justify-between gap-11 border-b border-hair pb-11">
        <h2
          id={`${id}-title`}
          className="flex items-baseline gap-11 font-display text-sub font-bold text-ink"
        >
          <span className="font-mono text-dense font-normal text-mut">
            {number}
          </span>
          {title}
        </h2>
        {optional && <span className="text-micro text-mut">Optional</span>}
      </div>
      <div className="mt-20 flex flex-col gap-20">{children}</div>
    </section>
  );
}
