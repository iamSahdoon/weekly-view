// A plain-language read of a new password (design §3.11, §6.22): a 0–4 score and a line.
// It rewards length first and variety second, and never claims more than that — the
// server's only rule is 8 to 72 characters (api_specification.md A5/A6).

const LABELS = [
  "Use at least 8 characters.",
  "Weak — add length or a mix of characters.",
  "Fair — longer or more varied would be stronger.",
  "Good.",
  "Strong.",
];

/** { score: 0–4, label } for `password`; an empty one scores 0 with no line. */
export function passwordStrength(password) {
  if (!password) return { score: 0, label: "" };
  if (password.length < 8) return { score: 0, label: LABELS[0] };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  let score = 1;
  if (password.length >= 12) score += 1;
  if (classes >= 3) score += 1;
  if (password.length >= 16 && classes >= 2) score += 1;
  score = Math.min(4, score);
  return { score, label: LABELS[score] };
}
