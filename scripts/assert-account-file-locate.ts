/**
 * Hub File resume must locate Blob beyond the exact account/file/<id>.json key.
 * Missing token must not hide a draft. /start stays closed.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function main() {
  const server = readFileSync(new URL("../lib/account/server.ts", import.meta.url), "utf8");
  assert.match(server, /export async function locateAccountByFileId/);
  assert.match(server, /list\(\{ prefix/);
  assert.match(server, /account\/file\/\$\{wanted\}/);
  assert.match(server, /account_scan/);
  assert.match(server, /function asAccountRecord/);
  assert.match(server, /token: String\(rec\.token \?\? ""\)/);
  assert.doesNotMatch(server, /if \(!parsed\?\.token \|\| !parsed\.fileId \|\| !parsed\.draft\) return undefined/);
  assert.match(server, /return \(await locateAccountByFileId\(fileId\)\)\.record/);

  const route = readFileSync(new URL("../app/api/account/route.ts", import.meta.url), "utf8");
  assert.match(route, /locateAccountByFileId/);
  assert.match(route, /wantLocate/);
  assert.match(route, /locate:/);

  const start = readFileSync(new URL("../components/fox/StartWorkspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(start, /locateAccountByFileId/);
  assert.doesNotMatch(start, /staff-hub-squares/);

  console.log("assert-account-file-locate: Blob list prefix + draft without token; /start closed");
}

main();
