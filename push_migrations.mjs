// push_migrations.mjs
// Pushes new SQL migrations directly to Supabase via the Management API
// This bypasses the CLI link requirement entirely.

import fs from 'fs';
import path from 'path';

// ─── CONFIG ──────────────────────────────────────────────────────────────
// Project ref is extracted from: https://xgzdscebuznishsferce.supabase.co
const PROJECT_REF = 'xgzdscebuznishsferce';

// You need a SERVICE_ROLE key (not anon) to run raw SQL.
// Get it from: Supabase Dashboard → Project Settings → API → service_role
// PASTE IT HERE ↓
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'PASTE_SERVICE_ROLE_KEY_HERE';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');
// ─────────────────────────────────────────────────────────────────────────

if (SERVICE_ROLE_KEY === 'PASTE_SERVICE_ROLE_KEY_HERE') {
    console.error('\n❌  Please set your service_role key.');
    console.error('    Run:  $env:SUPABASE_SERVICE_ROLE_KEY="ey...your-key..."');
    console.error('    Then: node push_migrations.mjs\n');
    process.exit(1);
}

const endpoint = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`;
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY,
};

async function runSQL(sql, label) {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sql }),
    });

    // exec_sql may not exist; fall back to pg REST endpoint
    if (res.status === 404) {
        // Use the official Management API
        const res2 = await fetch(
            `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ query: sql }),
            }
        );
        const data2 = await res2.json();
        if (!res2.ok) {
            console.error(`  ❌  ${label}:`, JSON.stringify(data2));
        } else {
            console.log(`  ✅  ${label}: OK`);
        }
        return;
    }

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
        console.error(`  ❌  ${label}:`, JSON.stringify(data));
    } else {
        console.log(`  ✅  ${label}: OK`);
    }
}

// Run migrations in order
const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

console.log(`\n🚀  Pushing ${files.length} migration file(s) to ${PROJECT_REF}...\n`);

for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`▶  ${file}`);
    await runSQL(sql, file);
}

console.log('\n✨  Done.\n');
