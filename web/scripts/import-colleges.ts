import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { planCollegeImport, parseIpedsDirectory, type ExistingCollege, type ImportAction } from "../lib/college-import.ts"

function arg(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index < 0) return null
  return process.argv[index + 1] ?? null
}

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function sqlActions(actions: ImportAction[]): string {
  const values = actions
    .map(
      (action) =>
        `(${sqlString(action.sourceId)}, ${sqlString(action.slug)}, ${sqlString(action.name)}, ${sqlString(action.city)}, ${sqlString(action.stateCode)}, ${sqlString(action.aliases.join("|"))}, ${sqlString(action.kind)})`,
    )
    .join(",\n")
  return `
begin;
create temporary table import_stage (
  source_id text not null,
  slug text not null,
  name text not null,
  city text not null,
  state_code char(2) not null,
  aliases text not null,
  kind text not null
) on commit drop;
insert into import_stage (source_id, slug, name, city, state_code, aliases, kind)
values
${values};
update public.colleges as college
set name = stage.name,
    city = stage.city,
    state_code = stage.state_code,
    source = 'ipeds',
    source_id = stage.source_id
from import_stage as stage
where stage.kind = 'update'
  and college.slug = stage.slug
  and (college.source_id is null or college.source_id = stage.source_id);
insert into public.colleges (slug, name, state_code, city, market_status, source, source_id)
select stage.slug, stage.name, stage.state_code, stage.city, 'planned', 'ipeds', stage.source_id
from import_stage as stage
where stage.kind = 'insert'
  and not exists (
    select 1 from public.colleges as college
    where college.source = 'ipeds' and college.source_id = stage.source_id
  );
delete from public.college_aliases as alias
using public.colleges as college, import_stage as stage
where alias.college_id = college.id
  and college.source = 'ipeds'
  and college.source_id = stage.source_id;
insert into public.college_aliases (college_id, alias)
select college.id, alias.value
from import_stage as stage
join public.colleges as college
  on college.source = 'ipeds' and college.source_id = stage.source_id
cross join lateral unnest(string_to_array(stage.aliases, '|')) as alias(value)
where char_length(btrim(alias.value)) >= 2
on conflict do nothing;
select count(*) filter (where market_status = 'active') as active_colleges,
       count(*) filter (where market_status = 'planned') as planned_colleges,
       count(*) as colleges
from public.colleges;
commit;
`
}

const csvPath = arg("--csv")
const database = arg("--database")
const dryRun = process.argv.includes("--dry-run")
if (!csvPath || !database) {
  console.error("Usage: import-colleges.ts --csv HD2024.csv --database postgresql://127.0.0.1/db [--dry-run]")
  process.exit(1)
}
const localUrl = /^postgres(ql)?:\/\/(?:(?:127\.0\.0\.1|localhost)(?::\d+)?\/|\/)/.test(database)
if (!localUrl) {
  console.error("Refusing a database URL that is not local. Hosted imports need a separate approval.")
  process.exit(1)
}

const parsed = parseIpedsDirectory(readFileSync(csvPath, "utf8"))
const existingJson = execFileSync(
  "psql",
  [
    database,
    "-At",
    "-c",
    "select coalesce(json_agg(json_build_object('id', id, 'slug', slug, 'name', name, 'city', city, 'stateCode', state_code, 'marketStatus', market_status, 'sourceId', source_id)), '[]'::json)::text from public.colleges",
  ],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
)
const existing = JSON.parse(existingJson) as ExistingCollege[]
const plan = planCollegeImport(existing, parsed.rows)
const inserts = plan.actions.filter((action) => action.kind === "insert").length
const updates = plan.actions.filter((action) => action.kind === "update").length
console.log(
  JSON.stringify(
    {
      parsed: parsed.rows.length,
      rejected: parsed.rejected,
      skipped: plan.skipped,
      inserts,
      updates,
      preservedActive: plan.preservedActive,
    },
    null,
    2,
  ),
)
if (dryRun) process.exit(0)
const sqlPath = "/tmp/college-import.sql"
writeFileSync(sqlPath, sqlActions(plan.actions))
execFileSync("psql", [database, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], { stdio: "inherit" })
