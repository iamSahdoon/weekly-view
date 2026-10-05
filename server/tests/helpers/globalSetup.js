import { MongoBinary } from "mongodb-memory-server";

// Runs once, before any test file. On a machine with no cached mongod (a fresh cloud
// container) every file's worker would otherwise start the ~70 MB download at once and
// trample each other's temp file (ENOENT on rename, ETXTBSY). Fetch it here, once.
export default async function setup() {
  await MongoBinary.getPath();
}
