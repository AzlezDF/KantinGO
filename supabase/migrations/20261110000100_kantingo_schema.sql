-- KantinGO core schema. Run with the Supabase CLI or paste into SQL Editor.
-- This migration intentionally uses auth.users as the identity source.

create type public.user_role as enum ('student', 'staff', 'admin');
create type public.order_status as enum (
    'awaiting_confirmation', 'accepted', 'preparing', 'ready_for_delivery',
    'delivering', 'ready_for_pickup', 'completed', 'rejected'
);
create type public.fulfillment_method as enum ('delivery', 'pickup');
create type public.payment_method as enum ('cash', 'qris');
create type public.payment_status as enum ('unpaid', 'awaiting_verification', 'paid', 'rejected');

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 2 and 120),
    nis text unique check (nis is null or char_length(nis) between 3 and 40),
    class_name text,
    role public.user_role not null default 'student',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    slug text not null unique,
    icon_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.products (
    id uuid primary key default gen_random_uuid(),
    category_id uuid not null references public.categories(id) on delete restrict,
    name text not null check (char_length(name) between 2 and 160),
    slug text not null unique,
    description text,
    price integer not null check (price >= 0),
    stock integer not null default 0 check (stock >= 0),
    image_path text,
    is_available boolean not null default true,
    sold_count integer not null default 0 check (sold_count >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.carts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.cart_items (
    id uuid primary key default gen_random_uuid(),
    cart_id uuid not null references public.carts(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    quantity integer not null check (quantity > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (cart_id, product_id)
);

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    order_number text not null unique,
    user_id uuid not null references public.profiles(id) on delete restrict,
    staff_id uuid references public.profiles(id) on delete set null,
    status public.order_status not null default 'awaiting_confirmation',
    fulfillment_method public.fulfillment_method not null,
    location_block text,
    location_room text,
    location_note text,
    order_note text,
    subtotal integer not null check (subtotal >= 0),
    total integer not null check (total >= 0),
    idempotency_key uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, idempotency_key),
    check (
        (fulfillment_method = 'pickup')
        or (location_block is not null and location_room is not null)
    )
);

create table public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    product_name text not null,
    unit_price integer not null check (unit_price >= 0),
    quantity integer not null check (quantity > 0),
    line_total integer not null check (line_total >= 0),
    created_at timestamptz not null default now()
);

create table public.order_status_history (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    changed_by uuid references public.profiles(id) on delete set null,
    status public.order_status not null,
    note text,
    created_at timestamptz not null default now()
);

create table public.payments (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null unique references public.orders(id) on delete cascade,
    method public.payment_method not null,
    status public.payment_status not null,
    amount integer not null check (amount >= 0),
    proof_path text,
    rejection_reason text,
    verified_by uuid references public.profiles(id) on delete set null,
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.reviews (
    id uuid primary key default gen_random_uuid(),
    order_item_id uuid not null unique references public.order_items(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    rating smallint not null check (rating between 1 and 5),
    comment text check (comment is null or char_length(comment) <= 1000),
    is_visible boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.promotions (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text unique,
    discount_amount integer not null default 0 check (discount_amount >= 0),
    starts_at timestamptz,
    ends_at timestamptz,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.store_settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    body text not null,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index products_category_available_idx on public.products (category_id, is_available);
create index products_popular_idx on public.products (sold_count desc);
create index orders_customer_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index notifications_user_unread_idx on public.notifications (user_id, read_at, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger carts_updated_at before update on public.carts for each row execute function public.set_updated_at();
create trigger cart_items_updated_at before update on public.cart_items for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger promotions_updated_at before update on public.promotions for each row execute function public.set_updated_at();

-- Registration can only create a student profile. Staff/admin provisioning is an
-- admin-only operation performed in SQL Dashboard or a future Edge Function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, name, nis, class_name, role)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Siswa KantinGO'),
        nullif(new.raw_user_meta_data ->> 'nis', ''),
        nullif(new.raw_user_meta_data ->> 'class_name', ''),
        'student'
    );
    return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role in ('staff', 'admin') and is_active
    );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and is_active
    );
$$;

create or replace function public.own_profile_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
    select role from public.profiles where id = auth.uid();
$$;

create or replace function public.own_profile_is_active()
returns boolean
language sql stable security definer set search_path = public as $$
    select is_active from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.promotions enable row level security;
alter table public.store_settings enable row level security;
alter table public.notifications enable row level security;

create policy "profiles: self or operations read" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select public.is_staff_or_admin()));
create policy "profiles: self update safe fields" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check (
    (select auth.uid()) = id
    and role = (select public.own_profile_role())
    and is_active = (select public.own_profile_is_active())
);
create policy "profiles: admin manage" on public.profiles for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "categories: public active read" on public.categories for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "categories: admin manage" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: public available read" on public.products for select to anon, authenticated using (is_available or (select public.is_admin()));
create policy "products: admin manage" on public.products for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "carts: owner manage" on public.carts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cart items: owner manage" on public.cart_items for all to authenticated using (
    exists (select 1 from public.carts where carts.id = cart_id and carts.user_id = auth.uid())
) with check (
    exists (select 1 from public.carts where carts.id = cart_id and carts.user_id = auth.uid())
);

create policy "orders: customer or operations read" on public.orders for select to authenticated
using ((select auth.uid()) = user_id or (select public.is_staff_or_admin()));
create policy "order items: customer or operations read" on public.order_items for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_id and (orders.user_id = auth.uid() or public.is_staff_or_admin())));
create policy "status history: customer or operations read" on public.order_status_history for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_id and (orders.user_id = auth.uid() or public.is_staff_or_admin())));
create policy "payments: customer or operations read" on public.payments for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_id and (orders.user_id = auth.uid() or public.is_staff_or_admin())));
create policy "reviews: public visible read" on public.reviews for select to anon, authenticated using (is_visible or (select public.is_admin()));
create policy "promotions: public active read" on public.promotions for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "settings: public read" on public.store_settings for select to anon, authenticated using (true);
create policy "settings: admin manage" on public.store_settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "notifications: owner read" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications: owner update" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "admin: reviews manage" on public.reviews for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin: promotions manage" on public.promotions for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reviews: verified buyer can create" on public.reviews for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
        select 1 from public.order_items
        join public.orders on orders.id = order_items.order_id
        where order_items.id = order_item_id
        and orders.user_id = auth.uid()
        and orders.status = 'completed'
    )
);

-- The browser never calculates prices or decrements stock. This RPC locks product
-- rows, rechecks availability, snapshots item details, and clears the cart atomically.
create or replace function public.checkout_cart(
    p_fulfillment_method public.fulfillment_method,
    p_location_block text,
    p_location_room text,
    p_location_note text,
    p_order_note text,
    p_payment_method public.payment_method,
    p_idempotency_key uuid
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    v_user_id uuid := auth.uid();
    v_cart_id uuid;
    v_order_id uuid;
    v_subtotal integer := 0;
    v_item record;
begin
    if v_user_id is null or not exists (select 1 from public.profiles where id = v_user_id and role = 'student' and is_active) then
        raise exception 'Hanya siswa aktif yang dapat membuat pesanan';
    end if;

    if exists (select 1 from public.orders where user_id = v_user_id and idempotency_key = p_idempotency_key) then
        return (select id from public.orders where user_id = v_user_id and idempotency_key = p_idempotency_key);
    end if;

    select id into v_cart_id from public.carts where user_id = v_user_id for update;
    if v_cart_id is null or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
        raise exception 'Keranjang belanja masih kosong';
    end if;

    for v_item in
        select ci.id as cart_item_id, ci.quantity, p.id as product_id, p.name, p.price, p.stock, p.is_available
        from public.cart_items ci
        join public.products p on p.id = ci.product_id
        where ci.cart_id = v_cart_id
        for update of p
    loop
        if not v_item.is_available or v_item.stock < v_item.quantity then
            raise exception 'Stok produk % sudah berubah', v_item.name;
        end if;
        v_subtotal := v_subtotal + (v_item.price * v_item.quantity);
    end loop;

    insert into public.orders (
        order_number, user_id, fulfillment_method, location_block, location_room,
        location_note, order_note, subtotal, total, idempotency_key
    ) values (
        'KGO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        v_user_id, p_fulfillment_method, nullif(trim(p_location_block), ''),
        nullif(trim(p_location_room), ''), nullif(trim(p_location_note), ''),
        nullif(trim(p_order_note), ''), v_subtotal, v_subtotal, p_idempotency_key
    ) returning id into v_order_id;

    for v_item in
        select ci.quantity, p.id as product_id, p.name, p.price
        from public.cart_items ci join public.products p on p.id = ci.product_id
        where ci.cart_id = v_cart_id
    loop
        insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
        values (v_order_id, v_item.product_id, v_item.name, v_item.price, v_item.quantity, v_item.price * v_item.quantity);
        update public.products set stock = stock - v_item.quantity, sold_count = sold_count + v_item.quantity where id = v_item.product_id;
    end loop;

    insert into public.payments (order_id, method, status, amount)
    values (v_order_id, p_payment_method, case when p_payment_method = 'qris' then 'awaiting_verification' else 'unpaid' end, v_subtotal);
    insert into public.order_status_history (order_id, changed_by, status, note)
    values (v_order_id, v_user_id, 'awaiting_confirmation', 'Pesanan dibuat oleh siswa.');
    delete from public.cart_items where cart_id = v_cart_id;
    return v_order_id;
end;
$$;

revoke all on function public.checkout_cart from public;
grant execute on function public.checkout_cart to authenticated;

insert into public.store_settings (key, value) values
    ('is_open', 'true'::jsonb),
    ('qris_image_path', 'null'::jsonb)
on conflict (key) do nothing;

-- Operational mutations are RPC-only, so users cannot skip valid state changes.
create or replace function public.transition_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
    v_order public.orders;
    v_is_valid boolean := false;
begin
    if not public.is_staff_or_admin() then
        raise exception 'Hanya petugas atau administrator yang dapat mengubah status pesanan';
    end if;

    select * into v_order from public.orders where id = p_order_id for update;
    if v_order.id is null then
        raise exception 'Pesanan tidak ditemukan';
    end if;

    v_is_valid := (v_order.status = 'awaiting_confirmation' and p_status in ('accepted', 'rejected'))
        or (v_order.status = 'accepted' and p_status in ('preparing', 'rejected'))
        or (v_order.status = 'preparing' and ((v_order.fulfillment_method = 'delivery' and p_status = 'ready_for_delivery') or (v_order.fulfillment_method = 'pickup' and p_status = 'ready_for_pickup')))
        or (v_order.status = 'ready_for_delivery' and p_status = 'delivering')
        or (v_order.status in ('delivering', 'ready_for_pickup') and p_status = 'completed');

    if not v_is_valid then
        raise exception 'Perubahan status tidak valid';
    end if;

    update public.orders set status = p_status, staff_id = auth.uid() where id = p_order_id;
    insert into public.order_status_history (order_id, changed_by, status, note) values (p_order_id, auth.uid(), p_status, nullif(trim(p_note), ''));
end;
$$;

create or replace function public.verify_payment(p_order_id uuid, p_status public.payment_status, p_rejection_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
    if not public.is_staff_or_admin() or p_status not in ('paid', 'rejected') then
        raise exception 'Aksi verifikasi tidak diizinkan';
    end if;

    update public.payments
    set status = p_status,
        rejection_reason = case when p_status = 'rejected' then nullif(trim(p_rejection_reason), '') else null end,
        verified_by = auth.uid(),
        verified_at = now()
    where order_id = p_order_id and status in ('unpaid', 'awaiting_verification');

    if not found then
        raise exception 'Pembayaran tidak dapat diverifikasi';
    end if;
end;
$$;

revoke all on function public.transition_order_status from public;
revoke all on function public.verify_payment from public;
grant execute on function public.transition_order_status to authenticated;
grant execute on function public.verify_payment to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
    ('payment-proofs', 'payment-proofs', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
    ('qris', 'qris', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product images: public read" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "payment proofs: payer upload" on storage.objects for insert to authenticated with check (
    bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "payment proofs: owner or operations read" on storage.objects for select to authenticated using (
    bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff_or_admin())
);
create policy "qris: authenticated read" on storage.objects for select to authenticated using (bucket_id = 'qris');
create policy "storage: admin manage" on storage.objects for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.orders, public.payments, public.notifications;
