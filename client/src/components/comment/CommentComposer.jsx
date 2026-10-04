import { useState } from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "../ui/Button.jsx";
import { Textarea } from "../ui/Textarea.jsx";

// A plain controlled textarea and a button (frontend_architecture.md §8.3). It owns
// the text only; the owner decides what posting does. The text is kept when the
// post fails, and cleared only when `onSubmit` resolves — so a refetch or an error
// never costs anyone what they typed (§6.2).
//
//   rows            2 for a reply (design §6.23), 3 for a new comment
//   initialValue    set when editing
//   onCancel        shows a Cancel button

const MAX = 2000;

export function CommentComposer({
  placeholder,
  submitLabel,
  minLength = 1,
  onSubmit,
  onCancel,
  initialValue = "",
  rows = 2,
  error,
  pending = false,
  autoFocus = false,
  label,
  className,
}) {
  const [text, setText] = useState(initialValue);
  const trimmed = text.trim();
  const tooShort = trimmed.length < minLength;

  const submit = async (event) => {
    event.preventDefault();
    if (tooShort || pending) return;
    try {
      await onSubmit(trimmed);
      setText("");
    } catch {
      // The owner shows the failure under the composer; the text stays.
    }
  };

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-8", className)}>
      <Textarea
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        rows={rows}
        maxLength={MAX}
        value={text}
        autoFocus={autoFocus}
        onChange={(event) => setText(event.target.value)}
        className="[&_textarea]:min-h-0"
      />
      {error && (
        <p role="alert" className="text-dense text-st-corr-fg">
          {error}
        </p>
      )}
      <div className="flex items-center gap-8">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={pending}
          disabled={tooShort}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
