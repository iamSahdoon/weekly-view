// What the brand panel says under the wordmark, per auth screen (owner decision, auth pages
// round four, 2026-10-17; design §3.12). Quiet, short, sentence case, no exclamation marks.
// A page names its line (`intro` on AuthScreen); a state inside a page — an expired link, an
// answer that never arrived — overrides it while it shows.

export const PANEL_INTROS = Object.freeze({
  signin: {
    title: "Welcome back.",
    line: "Your week is where you left it.",
  },
  signup: {
    title: "Three steps to your team’s first week",
    steps: [
      ["Create the owner account", "That’s you, right now."],
      ["Invite your team", "Send each person a link from Users."],
      [
        "Everyone posts a short update each day",
        "Friday’s weekly report builds itself.",
      ],
    ],
  },
  closed: {
    title: "This team is already set up.",
    line: "Its admins send the invite links. Until you have one, the demo shows how it works.",
  },
  invite: {
    title: "You’ve been invited to join the team.",
    line: "Choose your name and a password, and you’re in. One short update a day is all it asks.",
  },
  reset: {
    title: "A new password, then back to your week.",
    line: "This link works once. Saving signs you out on your other devices.",
  },
  expired: {
    title: "Links work once, for a limited time.",
    line: "An admin can send you a new one from Users.",
  },
  lost: {
    title: "The connection dropped, not your work.",
    line: "Signing in shows whether everything was saved.",
  },
});
