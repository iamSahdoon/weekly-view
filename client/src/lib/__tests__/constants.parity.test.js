import { describe, expect, it } from "vitest";
import { REPORT_STATUSES } from "../../../../server/src/constants/reportStatus.js";
import { ROLES } from "../../../../server/src/constants/roles.js";
import { TASK_STATUSES } from "../../../../server/src/constants/taskStatus.js";
import { TASK_TYPES } from "../../../../server/src/constants/taskTypes.js";
import { WEEKDAYS } from "../../../../server/src/constants/weekdays.js";
import * as client from "../constants.js";

// The five shared value sets (project_structure.md §7.1), read from both sides.
// A test only: nothing shipped imports across client/ and server/. Order is
// compared too — ROLES is a hierarchy, WEEKDAYS an offset from Monday.
const server = { REPORT_STATUSES, ROLES, TASK_STATUSES, TASK_TYPES, WEEKDAYS };

describe("constants parity", () => {
  for (const [name, values] of Object.entries(server)) {
    it(`${name} matches the server`, () => {
      expect([...client[name]]).toEqual([...values]);
    });
  }
});
