alter table startups
  add column if not exists is_not_urgent boolean not null default false,
  add column if not exists is_already_in_dd boolean not null default false;
