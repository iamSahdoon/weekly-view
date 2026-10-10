import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { demo } from "../demo/bootDemo.js";
import { FormStrip } from "../components/auth/FormStrip.jsx";
import { AuthPanel } from "../components/auth/AuthScreen.jsx";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { useDemoSignIn } from "../hooks/useAuthQueries.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { cn } from "../lib/cn.js";

// /demo for a signed-out visitor (design §3.14; frontend_architecture.md §9.18): the
// auth screens' frame, three choices. Picking one tells the adapter who is asking,
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
      className="min-h-[100dvh] bg-paper px-16 py-52 outline-none max-xs:py-32"
    >
      <div className="mx-auto w-full max-w-[420px]">
        <BrandMark className="mb-32 text-[20px]" />
        <h1 className="font-display text-page font-bold text-ink">
          Try WeeklyView
        </h1>
        <p className="mt-8 text-base text-mut">
          Pick who you&rsquo;d like to be. Everything works, nothing is saved.
        </p>
        <div className="mt-24">
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
                      "focus-inset flex w-full flex-col items-start gap-4 px-24 py-20 text-left max-xs:px-16",
                      "transition-colors duration-[120ms] ease-linear",
                      "enabled:hover:bg-tint disabled:cursor-wait",
                      chosen === role && signIn.isPending && "bg-tint",
                    )}
                  >
                    <span className="font-display text-panel font-bold text-ink">
                      {title}
                    </span>
                    <span className="text-base text-body">{line}</span>
                    <span className="text-dense text-mut">
                      You&rsquo;d be {who}
                    </span>
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
