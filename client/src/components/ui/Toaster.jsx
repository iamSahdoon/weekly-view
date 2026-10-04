import { Toaster as Sonner } from "sonner";

// tech_stack.md §6.7 and design §6.12: a dark floating layer, zero radius, a 2px
// left bar, two at most. No success toast for approval or autosave, ever; an
// error is raised with `toast.error(message, { duration: Infinity })` and stays.
// The surface is --d-panel, the dark-band token tokens.css reserves for toasts:
// --ink turns light in the dark theme, where it would match --d-text.

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={24}
      mobileOffset={20}
      visibleToasts={2}
      toastOptions={{
        unstyled: true,
        duration: 4000,
        classNames: {
          toast:
            "flex w-[min(380px,calc(100vw-40px))] min-h-[48px] items-start gap-11 border-l-2 border-l-acc " +
            "bg-d-panel px-16 py-14 font-ui text-dense text-d-text shadow-[var(--shadow-pop)]",
          title: "font-normal",
          description: "text-d-body",
          success: "border-l-st-appr-fg",
          error: "border-l-st-corr-fg",
          actionButton: "ml-auto font-medium text-acc-on-d",
          icon: "hidden",
        },
      }}
    />
  );
}
