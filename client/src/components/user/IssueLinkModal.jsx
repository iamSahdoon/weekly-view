import { useState } from "react";
import {
  useCreateResetLink,
  useReissueInvite,
} from "../../hooks/useUserQueries.js";
import { ROLE_LABELS } from "../../lib/constants.js";
import { errorCopy } from "../../lib/errorCopy.js";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";
import { LinkBlock } from "./LinkState.jsx";

// A password-reset link, or a re-issued invite link (design §3.10): confirm first — the
// earlier link stops working — then the same link state as a new invite, in this modal.
// The URL is component state and the mutation is reset once it is read (rule 7). An
// admin never types or sees a password. Mount it when it opens.

const COPY = {
  reissue: {
    title: "Re-issue invite",
    summary: "Make a new invite link for this person",
    ask: (p) =>
      `Re-issue the link for ${p.email}? The previous link stops working.`,
    action: "Re-issue link",
    note: (p) =>
      `Anyone with this link can join as ${ROLE_LABELS[p.role]}. It works once and expires in 7 days.`,
  },
  reset: {
    title: "Password reset link",
    summary: "Make a one-time link to set a new password",
    ask: (p) =>
      `Create a reset link for ${p.name}? Any earlier link stops working.`,
    action: "Create reset link",
    // "…for Nadia F. It works once…" — a name that ends in a full stop keeps just the one.
    note: (p) =>
      `This link lets whoever has it set a new password for ${p.name}${/[.!?]$/.test(p.name) ? "" : "."} It works once and expires in 24 hours.`,
  },
};

export function IssueLinkModal({ kind, person, open, onOpenChange }) {
  const reissue = useReissueInvite();
  const reset = useCreateResetLink();
  const mutation = kind === "reissue" ? reissue : reset;
  const copy = COPY[kind];
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  const issue = () =>
    mutation.mutate(person._id, {
      onSuccess: (data) => {
        setUrl(data.linkUrl);
        mutation.reset(); // the link now lives in this component only
      },
      onError: (e) => setError(errorCopy(e)),
    });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={copy.title}
      description={copy.summary}
      dismissible={!mutation.isPending}
      footer={
        url ? (
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        ) : (
          <>
            <Button
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button loading={mutation.isPending} onClick={issue}>
              {copy.action}
            </Button>
          </>
        )
      }
    >
      {url ? (
        <LinkBlock url={url}>{copy.note(person)}</LinkBlock>
      ) : (
        <>
          <p className="text-base text-body">{copy.ask(person)}</p>
          {error && (
            <p role="alert" className="mt-11 text-dense text-st-corr-fg">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
