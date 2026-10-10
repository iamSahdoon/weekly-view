import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthContext } from "../../context/AuthContext.jsx";
import { createDemoAdapter } from "../../demo/demoAdapter.js";
import { createDemoStore } from "../../demo/demoStore.js";
import { PERSPECTIVES } from "../../demo/fixtures.js";
import { apiClient } from "../../services/apiClient.js";
import * as userService from "../../services/userService.js";
import {
  useCreateResetLink,
  useInviteUser,
  useReissueInvite,
} from "../useUserQueries.js";

// A link comes back once and lives in the component that asked for it (frontend_architecture
// §5.7; CLAUDE.md: never log, return or cache a link token). Each link mutation has
// `gcTime: 0`, the modal resets it the moment it has read the link, and the `users` list the
// mutation invalidates never contains one — so after the modal has read it, no cache holds it.

let client;
let store;

beforeEach(() => {
  store = createDemoStore();
  store.session.userId = PERSPECTIVES.admin;
  apiClient.defaults.adapter = createDemoAdapter(store, { latency: 0 });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

// Runs a hook once under the providers and hands back what it returned.
function probe(hook) {
  let result;
  function Probe() {
    result = hook();
    return null;
  }
  renderToStaticMarkup(
    <AuthContext.Provider
      value={{ user: { _id: PERSPECTIVES.admin }, setUser() {}, signIn() {} }}
    >
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
  return result;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
const cachedText = () =>
  JSON.stringify([
    ...client
      .getMutationCache()
      .getAll()
      .map((m) => m.state),
    ...client
      .getQueryCache()
      .getAll()
      .map((q) => q.state.data),
  ]);

describe("link mutations never leave a link in a cache", () => {
  it("an invite: the caller reads the link, resets, and nothing holds it", async () => {
    const invite = probe(useInviteUser);
    const data = await invite.mutateAsync({
      email: "new@example.com",
      role: "member",
    });
    expect(data.linkUrl).toMatch(/\/invite\//);
    invite.reset();
    await settle();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(cachedText()).not.toContain(data.linkUrl);
  });

  it("a re-issue and a reset link behave the same", async () => {
    const invite = probe(useInviteUser);
    const issued = await invite.mutateAsync({
      email: "other@example.com",
      role: "member",
    });
    invite.reset();
    const reissue = probe(useReissueInvite);
    const again = await reissue.mutateAsync(issued.user._id);
    reissue.reset();
    const resetLink = probe(useCreateResetLink);
    const reset = await resetLink.mutateAsync(PERSPECTIVES.member);
    resetLink.reset();
    await settle();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    for (const url of [again.linkUrl, reset.linkUrl])
      expect(cachedText()).not.toContain(url);
  });

  it("the users list an invite invalidates carries no link", async () => {
    const invite = probe(useInviteUser);
    const data = await invite.mutateAsync({
      email: "third@example.com",
      role: "member",
    });
    invite.reset();
    const list = await client.fetchQuery({
      queryKey: ["users", { limit: 100 }],
      queryFn: () => userService.listUsers({ limit: 100 }),
    });
    expect(JSON.stringify(list)).not.toContain(data.linkUrl);
    expect(JSON.stringify(list)).not.toMatch(/linkUrl|linkToken/);
  });
});
