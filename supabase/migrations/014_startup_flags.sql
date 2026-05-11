-- Add urgency flag, admin notes, and Angel Accelerator flag to startups
alter table startups
  add column if not exists is_urgent boolean not null default false,
  add column if not exists admin_notes text,
  add column if not exists is_angel_accelerator boolean not null default false;
