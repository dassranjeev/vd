/**
 * One-shot database bootstrap.
 *
 *   npm run db:setup        create tables, seed content, create the first admin
 *   npm run db:seed         seed content only (skips DDL)
 *
 * Safe to re-run: the DDL is `if not exists`, content is only seeded into empty
 * tables, and the admin is only created when no user exists yet.
 */
// Must come first: lib/db reads DATABASE_URL when it is imported.
import "./load-env";

import { isDatabaseConfigured, sql } from "../lib/db";
import { runSetup, contentCounts } from "../lib/db/setup";

async function main() {
  const seedOnly = process.argv.includes("--seed-only");

  if (!isDatabaseConfigured) {
    console.error("\n  ✗ DATABASE_URL is not set.");
    console.error("    Copy .env.example to .env.local and fill in your Postgres connection string.\n");
    process.exit(1);
  }

  console.log(`\n  Running ${seedOnly ? "seed" : "setup"}…\n`);

  const report = await runSetup({ seedOnly });

  if (!seedOnly) console.log(`  ✓ Schema ensured (${report.tablesEnsured} statements)`);
  console.log(`  ✓ Sections seeded: ${report.sectionsSeeded}`);
  console.log(`  ✓ New sections added: ${report.sectionsAdded}`);
  console.log(`  ✓ Videos seeded: ${report.videosSeeded}`);
  console.log(`  ✓ Social links seeded: ${report.socialSeeded}`);

  for (const note of report.notes) {
    if (note) console.log(`    · ${note}`);
  }

  if (report.adminCreated) {
    console.log(`\n  ✓ Sign in at /admin/login as ${report.adminEmail}`);
    console.log("    Change that password from Account once you're in.");
  }

  const counts = await contentCounts();
  console.log(
    `\n  Totals — videos ${counts.videos} (${counts.published} live), sections ${counts.sections}, users ${counts.users}\n`,
  );
}

main()
  .then(async () => {
    await sql?.end({ timeout: 5 });
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n  ✗ Setup failed:", error instanceof Error ? error.message : error, "\n");
    await sql?.end({ timeout: 5 });
    process.exit(1);
  });
