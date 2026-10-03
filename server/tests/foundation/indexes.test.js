import { describe, expect, it } from "vitest";
import mongoose from "mongoose";

// Every index in database_schema.md §6, and no others besides _id.
const collation = { locale: "en", strength: 2 };
const expected = {
  users: [
    { key: { email: 1 }, unique: true },
    { key: { projects: 1 } },
    { key: { status: 1 } },
    { key: { linkTokenHash: 1 }, unique: true, sparse: true },
    {
      key: { isOwner: 1 },
      unique: true,
      partialFilterExpression: { isOwner: true },
    },
  ],
  projects: [{ key: { name: 1 }, unique: true, collation }],
  tasks: [{ key: { owner: 1, doneAt: 1 } }],
  reports: [
    { key: { author: 1, weekKey: 1 }, unique: true },
    { key: { weekKey: 1, status: 1 } },
    { key: { status: 1, approvalRequested: 1, submittedAt: 1 } },
    { key: { "days.lines.project": 1 } },
  ],
  revisions: [
    { key: { report: 1, revisionNumber: 1 }, unique: true },
    { key: { submittedAt: -1 } },
    { key: { reviewedAt: -1 } },
  ],
  holidays: [{ key: { date: 1 }, unique: true }],
  seenMarks: [{ key: { user: 1, report: 1 }, unique: true }],
};

const shape = (index) => ({
  key: index.key,
  ...(index.unique && { unique: true }),
  ...(index.sparse && { sparse: true }),
  ...(index.partialFilterExpression && {
    partialFilterExpression: index.partialFilterExpression,
  }),
  ...(index.collation && {
    collation: {
      locale: index.collation.locale,
      strength: index.collation.strength,
    },
  }),
});

describe("indexes (database_schema.md §6)", () => {
  it("uses exactly the seven collection names", async () => {
    const names = (
      await mongoose.connection.db.listCollections().toArray()
    ).map((c) => c.name);
    expect(names.sort()).toEqual(Object.keys(expected).sort());
  });

  it.each(Object.keys(expected))(
    "%s has every index it should, and no others",
    async (name) => {
      const indexes = await mongoose.connection.db.collection(name).indexes();
      const actual = indexes.filter((i) => i.name !== "_id_").map(shape);
      const sortByKey = (list) =>
        [...list].sort((a, b) =>
          JSON.stringify(a.key).localeCompare(JSON.stringify(b.key)),
        );
      expect(sortByKey(actual)).toEqual(sortByKey(expected[name]));
    },
  );
});
