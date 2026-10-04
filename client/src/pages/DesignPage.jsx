import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "../components/shell/BrandMark.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Field } from "../components/ui/Field.jsx";
import { InlineError } from "../components/ui/InlineError.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Panel } from "../components/ui/Panel.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StatusChip } from "../components/ui/StatusChip.jsx";
import { Switch } from "../components/ui/Switch.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { Tooltip } from "../components/ui/Tooltip.jsx";
import { useTheme } from "../hooks/useTheme.js";
import {
  REPORT_STATUSES,
  TASK_STATUSES,
  TASK_TYPE_COLORS,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  WEEK_STATES,
} from "../lib/constants.js";

// /design — the development-only style guide (design §12 step 1): every ui/
// primitive in every state it has, in either theme. Hover, focus and press are
// live: tab through the page to see the focus ring.

const SURFACES = ["paper", "card", "tint", "tint2"];
const TEXT = ["ink", "body", "mut", "acc-txt"];
const LINES = ["hair", "hair2", "rule", "acc"];
const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "destructive"];
const TASK_TYPE_OPTIONS = TASK_TYPES.map((value) => ({
  value,
  label: TASK_TYPE_LABELS[value],
}));

export default function DesignPage() {
  const { theme, setTheme } = useTheme();
  return (
    <main className="min-h-[100dvh] bg-paper px-16 py-32 md:px-32">
      <div className="mx-auto flex max-w-[var(--page-max)] flex-col gap-32">
        <header className="flex flex-wrap items-center justify-between gap-16">
          <div className="flex flex-col gap-8">
            <BrandMark className="text-[20px]" />
            <h1 className="font-display text-page font-bold text-ink">
              Design system
            </h1>
            <p className="text-base text-mut">
              Development only. Every primitive in every state.
            </p>
          </div>
          <div className="flex gap-8" role="group" aria-label="Theme">
            <Button
              variant={theme === "light" ? "primary" : "secondary"}
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "primary" : "secondary"}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
          </div>
        </header>

        <Tokens />
        <Typography />
        <Buttons />
        <Inputs />
        <Choices />
        <Chips />
        <Panels />
        <Overlays />
        <Feedback />
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <Panel title={title}>
      <div className="flex flex-col gap-24">{children}</div>
    </Panel>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-micro text-mut">{label}</p>
      <div className="flex flex-wrap items-center gap-11">{children}</div>
    </div>
  );
}

function Swatch({ token, kind = "bg" }) {
  const style =
    kind === "bg"
      ? { background: `var(--${token})` }
      : kind === "text"
        ? { color: `var(--${token})` }
        : { borderColor: `var(--${token})` };
  return (
    <div className="flex w-[120px] flex-col gap-4">
      <div
        className={
          kind === "line"
            ? "h-[44px] border-2 bg-card"
            : "flex h-[44px] items-center border border-hair px-11"
        }
        style={style}
      >
        {kind === "text" && <span className="text-base font-medium">Aa</span>}
      </div>
      <span className="font-mono text-micro text-mut">--{token}</span>
    </div>
  );
}

function Tokens() {
  return (
    <Section title="Tokens">
      <Row label="Surfaces">
        {SURFACES.map((t) => (
          <Swatch key={t} token={t} />
        ))}
      </Row>
      <Row label="Text">
        {TEXT.map((t) => (
          <Swatch key={t} token={t} kind="text" />
        ))}
      </Row>
      <Row label="Lines">
        {LINES.map((t) => (
          <Swatch key={t} token={t} kind="line" />
        ))}
      </Row>
      <Row label="Accent">
        {["acc", "acc-d", "acc-l"].map((t) => (
          <Swatch key={t} token={t} />
        ))}
      </Row>
      <Row label="Dark band">
        {["d-panel", "d-panel2", "d-line"].map((t) => (
          <Swatch key={t} token={t} />
        ))}
      </Row>
      <Row label="Task types">
        {TASK_TYPES.map((type) => (
          <div key={type} className="flex w-[120px] flex-col gap-4">
            <div
              className="h-[44px]"
              style={{ background: TASK_TYPE_COLORS[type] }}
            />
            <span className="text-micro text-mut">
              {TASK_TYPE_LABELS[type]}
            </span>
          </div>
        ))}
      </Row>
    </Section>
  );
}

function Typography() {
  return (
    <Section title="Type">
      <p className="font-display text-metric text-ink tabular-nums">1,284</p>
      <p className="font-display text-page font-bold text-ink">
        Page title, Chivo 28
      </p>
      <p className="font-display text-sub font-bold text-ink">
        Subheading, Chivo 20
      </p>
      <p className="font-display text-panel font-bold text-ink">
        Panel title, Chivo 17
      </p>
      <p className="text-lg text-body">
        Body large, Instrument Sans 16 — written for the writer.
      </p>
      <p className="text-base text-body">
        Body, Instrument Sans 14 — the default reading size.
      </p>
      <p className="text-dense text-body">
        Dense, 13 — table cells, labels and chips.
      </p>
      <p className="text-caption text-mut">Caption, 12 — helper text.</p>
      <p className="text-micro text-mut">
        Micro label, 11 — table headers and nav groups.
      </p>
      <p className="font-mono text-caption text-ink">
        W38 · 14–18 Sep · rev 3 · 7.5 h · 11 Sep 09:14
      </p>
    </Section>
  );
}

function Buttons() {
  return (
    <Section title="Button">
      {BUTTON_VARIANTS.map((variant) => (
        <Row key={variant} label={variant}>
          <Button variant={variant} size="sm">
            Small
          </Button>
          <Button variant={variant}>Default</Button>
          <Button variant={variant} size="lg">
            Large
          </Button>
          <Button variant={variant} disabled>
            Disabled
          </Button>
          <Button variant={variant} loading>
            Loading
          </Button>
          <Button variant={variant} iconOnly aria-label="Information">
            <Info aria-hidden="true" />
          </Button>
        </Row>
      ))}
      <div className="bg-ink p-20">
        <Row label="inverted (on --ink)">
          <Button variant="inverted">Inverted</Button>
          <Button variant="inverted" disabled>
            Disabled
          </Button>
          <Button variant="inverted" loading>
            Loading
          </Button>
        </Row>
      </div>
    </Section>
  );
}

function Inputs() {
  return (
    <Section title="Input, Select, Textarea, Field">
      <div className="grid gap-20 md:grid-cols-2">
        <Field label="Default" helper="Helper text sits 6px below.">
          <Input placeholder="Placeholder" />
        </Field>
        <Field label="Optional" optional>
          <Input defaultValue="Filled — no has-value styling" />
        </Field>
        <Field label="Error" error="Enter more than zero.">
          <Input type="number" defaultValue="0" />
        </Field>
        <Field label="Disabled">
          <Input disabled defaultValue="Can't change this" />
        </Field>
        <Field label="Read-only">
          <Input readOnly value="imali@example.com" />
        </Field>
        <Field label="Hours" helper="Prefix and suffix are mono 12px.">
          <Input
            type="number"
            suffix="h"
            defaultValue="7.5"
            className="max-w-[120px]"
          />
        </Field>
        <Field label="Large (auth screens)">
          <Input size="lg" placeholder="44px tall" />
        </Field>
        <Field label="Select with placeholder">
          <Select
            placeholder="Choose a type"
            defaultValue=""
            options={TASK_TYPE_OPTIONS}
            className="max-w-[260px]"
          />
        </Field>
        <Field label="Select, chosen">
          <Select
            defaultValue="testing"
            options={TASK_TYPE_OPTIONS}
            className="max-w-[260px]"
          />
        </Field>
        <Field label="Select, error" error="Choose a status.">
          <Select
            placeholder="Choose a status"
            defaultValue=""
            options={TASK_TYPE_OPTIONS}
            className="max-w-[260px]"
          />
        </Field>
        <Field label="Select, disabled">
          <Select
            disabled
            defaultValue="review"
            options={TASK_TYPE_OPTIONS}
            className="max-w-[260px]"
          />
        </Field>
        <Field label="Textarea" optional>
          <Textarea placeholder="What did you do?" />
        </Field>
        <Field label="Textarea at its limit">
          <Textarea
            showCount
            maxLength={40}
            defaultValue="Forty characters exactly, counted here.."
          />
        </Field>
        <Field label="Textarea, disabled">
          <Textarea disabled defaultValue="Frozen once submitted." />
        </Field>
      </div>
    </Section>
  );
}

function Choices() {
  return (
    <Section title="Checkbox, Switch">
      <Row label="Checkbox">
        <Checkbox label="Unchecked" />
        <Checkbox label="Checked" defaultChecked />
        <Checkbox label="Indeterminate" indeterminate />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Disabled, checked" disabled defaultChecked />
      </Row>
      <Row label="Switch">
        <Switch label="Open to team comments" />
        <Switch label="I'm on leave" defaultChecked />
        <Switch label="Disabled" disabled />
        <Switch label="Disabled, on" disabled defaultChecked />
      </Row>
    </Section>
  );
}

function Chips() {
  return (
    <Section title="StatusChip">
      <Row label="Report">
        {REPORT_STATUSES.map((s) => (
          <StatusChip key={s} value={s} />
        ))}
      </Row>
      <Row label="Week">
        {WEEK_STATES.map((s) => (
          <StatusChip key={s} kind="week" value={s} />
        ))}
      </Row>
      <Row label="Small">
        {REPORT_STATUSES.map((s) => (
          <StatusChip key={s} value={s} size="sm" />
        ))}
      </Row>
      <Row label="Task (small, neutral)">
        {TASK_STATUSES.map((s) => (
          <StatusChip key={s} kind="task" value={s} size="sm" />
        ))}
      </Row>
      <Row label="User">
        <StatusChip kind="user" value="active" />
        <StatusChip kind="user" value="invited" />
        <StatusChip value="submitted" />
        <span className="text-micro text-mut">Approval asked</span>
      </Row>
    </Section>
  );
}

function Panels() {
  return (
    <Section title="Panel, EmptyState, Skeleton, Avatar">
      <div className="grid gap-20 md:grid-cols-2">
        <Panel
          title="With header and footer"
          actions={
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          }
          footer={<Button size="sm">Save</Button>}
        >
          <p className="text-base text-body">Default padding, 24px.</p>
        </Panel>
        <Panel padding="dense">
          <p className="text-base text-body">Dense padding, 20px, no header.</p>
        </Panel>
      </div>
      <Panel padding="none">
        <EmptyState
          title="Your first week starts here."
          action={<Button>Post today's update</Button>}
        >
          Post what you did today. Your weekly report builds itself from your
          daily updates.
        </EmptyState>
      </Panel>
      <Row label="Skeleton">
        <div className="flex w-full max-w-[560px] flex-col gap-8">
          <Skeleton className="h-[var(--row-h)]" />
          <Skeleton className="h-[var(--row-h)] w-3/4" />
          <Skeleton className="h-[var(--row-h)] w-1/2" />
        </div>
      </Row>
      <Row label="Avatar">
        {[22, 28, 32, 44].map((size) => (
          <Avatar key={size} size={size} name="Imali J." />
        ))}
        <Avatar size={44} name="Nadia F." />
      </Row>
    </Section>
  );
}

function Overlays() {
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);

  const runConfirm = () => {
    setPending(true);
    setTimeout(() => {
      setPending(false);
      setConfirm(false);
    }, 1500);
  };

  return (
    <Section title="Modal, ConfirmDialog, Tooltip, Toast">
      <Row label="Modal">
        {["sm", "md", "lg"].map((size) => (
          <Button key={size} variant="secondary" onClick={() => setModal(size)}>
            Open {size}
          </Button>
        ))}
        <Button variant="destructive" onClick={() => setConfirm(true)}>
          Remove Imali J.
        </Button>
      </Row>
      <Row label="Tooltip (350ms delay)">
        <Tooltip content="Hours are counted from the week's lines.">
          <Button variant="secondary">Hover or focus me</Button>
        </Tooltip>
      </Row>
      <Row label="Toast — sanctioned uses only">
        <Button
          variant="secondary"
          onClick={() => toast("Role changed to Manager.")}
        >
          Info
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.success("Nadia F. can now review reports.")}
        >
          Success out of view
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.error("Couldn't save your changes.", { duration: Infinity })
          }
        >
          Error (stays)
        </Button>
      </Row>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        size={modal ?? "md"}
        title={`Modal, ${modal ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={() => setModal(null)}>Save</Button>
          </>
        }
      >
        <div className="flex flex-col gap-20">
          <Field label="Project name">
            <Input defaultValue="Client A" />
          </Field>
          {Array.from({ length: 8 }, (_, i) => (
            <p key={i} className="text-base text-body">
              Scroll the body: hairlines appear at the scrolled edges. Line{" "}
              {i + 1}.
            </p>
          ))}
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Remove Imali J.?"
        confirmLabel="Remove"
        pending={pending}
        onConfirm={runConfirm}
      >
        Imali J. can no longer sign in. Their reports and comments stay on the
        team's record. While this runs, Esc and the backdrop do nothing.
      </ConfirmDialog>
    </Section>
  );
}

function Feedback() {
  return (
    <Section title="InlineError">
      <InlineError title="Couldn't load this week." onRetry={() => {}}>
        The server didn't answer. Your changes are kept.
      </InlineError>
      <InlineError title="This link can't be used." code="LINK_INVALID">
        The code shows only when it is actionable.
      </InlineError>
    </Section>
  );
}
