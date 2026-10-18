import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { demo } from "../demo/bootDemo.js";
import { requestTour } from "../demo/tour/tourBus.js";
import { tourMinutes } from "../demo/tour/tourSteps.js";
import { FormStrip } from "../components/auth/FormStrip.jsx";
import { AuthPanel } from "../components/auth/AuthScreen.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { useDemoSignIn } from "../hooks/useAuthQueries.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { cn } from "../lib/cn.js";

// /demo for a signed-out visitor (design §3.14; frontend_architecture.md §9.18): the
// auth screens' frame and two ways in (owner request, 2026-10-17). The guided tour, with
// its length, or a jump to any part of it — both handed to the tour layer. Or explore on
// your own: three choices. Picking one tells the adapter who is asking,
// reads that person's Me (A4), signs in without a token and opens "This week" — or the
// dashboard's home for the role, which is the same page. The only file outside
// apiClient that imports the demo (project_structure.md §3.4); it loads in its own chunk.

const CHOICES = [
  {
    role: "member",
    title: "Team member",
    line: "Post updates, build and submit a week",
    who: "Imali J.",
  },
  {
    role: "manager",
    title: "Manager",
    line: "Read the team, comment, approve, track projects",
    who: "Nadia F.",
  },
  {
    role: "admin",
    title: "Admin",
    line: "Everything a manager does, plus people and holidays",
    who: "Sanduni B., the owner",
  },
];

// A choice: the whole row is the button; under the pointer it gets the nav's 2px
// cobalt bar.
const CHOICE = cn(
  "focus-inset group relative flex w-full items-center gap-16 px-24 py-20 text-left max-xs:px-16",
  "transition-colors duration-[120ms] ease-linear",
  "before:absolute before:inset-y-0 before:left-0 before:w-2 before:bg-acc before:opacity-0 before:transition-opacity before:duration-[120ms]",
  "enabled:hover:bg-tint enabled:hover:before:opacity-100 disabled:cursor-wait",
);

function Chevron() {
  return (
    <ChevronRight
      aria-hidden="true"
      strokeWidth={1.5}
      className="size-[18px] shrink-0 text-mut transition-[color,transform] duration-[160ms] ease-[var(--ease-out)] group-enabled:group-hover:translate-x-2 group-enabled:group-hover:text-acc-txt"
    />
  );
}

export default function DemoEntryPage() {
  useDocumentTitle("Demo");
  const navigate = useNavigate();
  const signIn = useDemoSignIn(demo.setPerspective);
  const [chosen, setChosen] = useState(null);

  const choose = (role) => {
    setChosen(role);
    signIn.mutate(role, {
      onSuccess: () => navigate("/", { replace: true }),
    });
  };

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[100dvh] bg-paper px-16 pt-[max(52px,18vh)] pb-52 outline-none max-xs:pt-32"
    >
      <div className="mx-auto w-full max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
        <h1 className="font-display text-page font-bold text-ink">
          Try WeeklyView
        </h1>
        <p className="mt-8 text-base text-mut">
          Take the guided tour, or look around on your own.
        </p>
        <div className="mt-24">
          <AuthPanel padding="none">
            <button
              type="button"
              onClick={() => requestTour("start")}
              disabled={signIn.isPending}
              className={cn(CHOICE, "border-b border-hair")}
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-4">
                <span className="font-display text-panel font-bold text-ink">
                  Take the guided tour
                </span>
                <span className="text-base text-body">
                  One team&rsquo;s week, from setting up to approving: every
                  feature, for every role.
                </span>
                <span className="text-dense text-mut">
                  About {tourMinutes()} minutes, or jump to any part
                </span>
              </span>
              <Chevron />
            </button>
            <div className="px-24 py-11 max-xs:px-16">
              <button
                type="button"
                onClick={() => requestTour("panel")}
                aria-haspopup="dialog"
                className="text-dense text-acc-txt underline underline-offset-[3px] hover:text-acc-d"
              >
                Jump to a part
              </button>
            </div>
          </AuthPanel>
        </div>
        <h2 className="mt-32 font-display text-sub font-bold text-ink">
          Explore on your own
        </h2>
        <p className="mt-8 text-base text-mut">
          Pick who you&rsquo;d like to be. Everything works, nothing is saved.
        </p>
        <div className="mt-20">
          <AuthPanel padding="none">
            {signIn.isError && (
              <div className="border-b border-hair p-14">
                <FormStrip>The demo didn&rsquo;t start. Try again.</FormStrip>
              </div>
            )}
            <ul>
              {CHOICES.map(({ role, title, line, who }) => (
                <li key={role} className="border-b border-hair last:border-b-0">
                  <button
                    type="button"
                    disabled={signIn.isPending}
                    aria-busy={chosen === role && signIn.isPending}
                    onClick={() => choose(role)}
                    className={cn(
                      CHOICE,
                      chosen === role &&
                        signIn.isPending &&
                        "bg-tint before:opacity-100",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-4">
                      <span className="font-display text-panel font-bold text-ink">
                        {title}
                      </span>
                      <span className="text-base text-body">{line}</span>
                      <span className="text-dense text-mut">
                        You&rsquo;d be {who}
                      </span>
                    </span>
                    <Chevron />
                  </button>
                </li>
              ))}
            </ul>
          </AuthPanel>
        </div>
        <p className="mt-20 text-dense">
          <a
            href="/"
            className="text-acc-txt underline underline-offset-[3px] hover:text-acc-d"
          >
            Back to the start page
          </a>
        </p>
      </div>
    </main>
  );
}
