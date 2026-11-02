import type { Db } from "./client.ts";

const STATEMENTS = [
  `create table if not exists events (
    id text primary key,
    league text not null,
    home text not null,
    away text not null,
    home_name text not null,
    away_name text not null,
    starts_at timestamptz not null,
    status text not null,
    winner text,
    home_score int,
    away_score int,
    backfilled_at timestamptz,
    updated_at timestamptz not null default now()
  )`,
  "create index if not exists events_starts_at on events (starts_at)",
  `create table if not exists snapshots (
    event_id text not null references events(id),
    source text not null,
    home_prob double precision not null,
    at timestamptz not null,
    kind text not null,
    primary key (event_id, source, at)
  )`,
  `create table if not exists btc_candles (
    start_at timestamptz primary key,
    open double precision not null,
    high double precision not null,
    low double precision not null,
    close double precision not null
  )`,
  `create table if not exists rules (
    id text primary key,
    owner text not null,
    hunch text not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists rule_versions (
    rule_id text not null references rules(id),
    version int not null,
    rule jsonb not null,
    compiled_by text not null,
    created_at timestamptz not null default now(),
    primary key (rule_id, version)
  )`,
  `create table if not exists picks (
    id text primary key,
    owner text not null,
    rule_id text,
    version int,
    stage text not null,
    market text not null,
    side text not null,
    confidence double precision not null,
    why text not null,
    inputs jsonb not null,
    picked_at timestamptz not null,
    expires_at timestamptz not null,
    entry_price double precision,
    exit_price double precision,
    exit_at timestamptz,
    outcome int,
    brier double precision
  )`,
  "create index if not exists picks_open on picks (expires_at) where outcome is null",
  "alter table rules add column if not exists paused boolean not null default false",
  "alter table rule_versions add column if not exists stage text not null default 'practice'",
  "alter table rule_versions add column if not exists hunch text",
  "alter table rule_versions add column if not exists on_record_at timestamptz",
  "alter table picks add column if not exists event_id text",
  "alter table picks add column if not exists address text",
  "alter table picks add column if not exists delegation_id text",
  "alter table picks add column if not exists payload jsonb",
  "alter table picks add column if not exists hash text",
  "alter table picks add column if not exists signature text",
  "alter table picks add column if not exists agent text",
  "alter table picks add column if not exists anchor_id text",
  "alter table picks add column if not exists proof jsonb",
  "alter table picks add column if not exists retracted_at timestamptz",
  "alter table picks add column if not exists retraction jsonb",
  "create index if not exists picks_event on picks (event_id)",
  `create table if not exists delegations (
    id text primary key,
    address text not null,
    agent text not null,
    message text not null,
    signature text not null,
    until timestamptz not null,
    per_day int not null,
    test boolean not null,
    created_at timestamptz not null default now(),
    revoked_at timestamptz
  )`,
  `create table if not exists challenges (
    nonce text primary key,
    message text not null,
    expires_at timestamptz not null
  )`,
  `create table if not exists sessions (
    token_hash text primary key,
    address text not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists anchors (
    id text primary key,
    root text not null,
    count int not null,
    network text not null,
    status text not null,
    digest text,
    error text,
    created_at timestamptz not null default now(),
    anchored_at timestamptz
  )`,
  `create table if not exists anchor_leaves (
    anchor_id text not null references anchors(id),
    leaf text not null,
    kind text not null,
    pick_id text not null,
    position int not null,
    primary key (anchor_id, position)
  )`,
  `create table if not exists anchor_reads (
    digest text primary key,
    result jsonb not null,
    read_at timestamptz not null default now()
  )`,
  `create table if not exists fires (
    id bigserial primary key,
    rule_id text not null,
    version int not null,
    event_id text not null,
    at timestamptz not null,
    fired boolean not null,
    why jsonb not null,
    pick_id text
  )`,
  "create index if not exists fires_rule on fires (rule_id, version, at desc)",
  `create table if not exists notifications (
    id bigserial primary key,
    address text not null,
    pick_id text,
    text text not null,
    created_at timestamptz not null default now(),
    read_at timestamptz
  )`,
  `create table if not exists memories (
    id text primary key,
    namespace text not null,
    text text not null,
    idempotency_key text not null unique,
    status text not null,
    job_id text,
    blob_id text,
    attempts int not null default 0,
    error text,
    created_at timestamptz not null default now(),
    written_at timestamptz
  )`,
  "alter table events add column if not exists title text",
  `create table if not exists odds_api_usage (
    day date primary key,
    calls int not null,
    remaining int
  )`,
  `create table if not exists tatum_usage (
    day date not null,
    method text not null,
    calls int not null,
    primary key (day, method)
  )`,
];

export async function migrate(db: Db): Promise<void> {
  for (const statement of STATEMENTS) await db.unsafe(statement);
}
