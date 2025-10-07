-- Create wallets and wallet_transactions tables
create table if not exists wallets (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance numeric default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  amount numeric not null,
  payment_method text,
  status text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Index for querying user transactions fast
create index if not exists idx_wallet_transactions_user on wallet_transactions(user_id);
