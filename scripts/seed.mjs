// node scripts/seed.mjs
import 'dotenv/config';
import pg from 'pg';

const { SUPABASE_DB_CONNECTION } = process.env; // e.g. postgres://user:pass@host:5432/postgres
if (!SUPABASE_DB_CONNECTION) {
  console.error('Missing SUPABASE_DB_CONNECTION');
  process.exit(1);
}

const client = new pg.Client({ connectionString: SUPABASE_DB_CONNECTION });
await client.connect();

const { rows: schoolRows } = await client.query(
  `insert into public.schools (name) values ($1)
   on conflict do nothing returning id`,
  ['Demo School']
);
const schoolId = schoolRows[0]?.id || (await client.query(`select id from public.schools where name=$1 limit 1`, ['Demo School'])).rows[0].id;

const items = [
  {
    domain: 'Maths',
    type: 'mcq',
    prompt: 'What is 7 × 6?',
    options: ['40', '42', '48', '56'],
    correct_index: 1
  },
  {
    domain: 'English',
    type: 'written',
    prompt: 'Write two sentences describing your favourite book.',
    options: null,
    correct_index: null
  },
  {
    domain: 'Reasoning',
    type: 'mcq',
    prompt: 'Find the odd one out: 2, 4, 8, 16, 20.',
    options: ['2', '4', '8', '16', '20'],
    correct_index: 4
  }
];

for (const it of items) {
  await client.query(
    `insert into public.items (school_id, domain, type, prompt, options, correct_index, active)
     values ($1,$2,$3,$4,$5,$6,true)`,
    [schoolId, it.domain, it.type, it.prompt, it.options ? JSON.stringify(it.options) : null, it.correct_index]
  );
}

console.log('Seeded: school + 3 items');
await client.end();
