-- Prevent direct RPC callers from ordering while staff has closed the canteen.
create or replace function public.reject_orders_when_store_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if coalesce((select (value #>> '{}')::boolean from public.store_settings where key = 'is_open'), true) is false then
        raise exception 'Kantin sedang tutup dan belum menerima pesanan.';
    end if;

    return new;
end;
$$;

drop trigger if exists orders_require_open_store on public.orders;
create trigger orders_require_open_store
before insert on public.orders
for each row execute function public.reject_orders_when_store_closed();

alter publication supabase_realtime add table public.store_settings, public.products;
