-- PostgreSQL infers CASE branches as text unless the result is cast explicitly.
-- The payments.status column is public.payment_status, so checkout must cast
-- the selected value before inserting it.
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
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_cart_id uuid;
    v_order_id uuid;
    v_subtotal integer := 0;
    v_item record;
begin
    if v_user_id is null or not exists (
        select 1 from public.profiles
        where id = v_user_id and role = 'student' and is_active
    ) then
        raise exception 'Hanya siswa aktif yang dapat membuat pesanan';
    end if;

    if exists (
        select 1 from public.orders
        where user_id = v_user_id and idempotency_key = p_idempotency_key
    ) then
        return (
            select id from public.orders
            where user_id = v_user_id and idempotency_key = p_idempotency_key
        );
    end if;

    select id into v_cart_id
    from public.carts
    where user_id = v_user_id
    for update;

    if v_cart_id is null or not exists (
        select 1 from public.cart_items where cart_id = v_cart_id
    ) then
        raise exception 'Keranjang belanja masih kosong';
    end if;

    for v_item in
        select ci.id as cart_item_id, ci.quantity, p.id as product_id,
               p.name, p.price, p.stock, p.is_available
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
        order_number, user_id, fulfillment_method, location_block,
        location_room, location_note, order_note, subtotal, total,
        idempotency_key
    ) values (
        'KGO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        v_user_id,
        p_fulfillment_method,
        nullif(trim(p_location_block), ''),
        nullif(trim(p_location_room), ''),
        nullif(trim(p_location_note), ''),
        nullif(trim(p_order_note), ''),
        v_subtotal,
        v_subtotal,
        p_idempotency_key
    ) returning id into v_order_id;

    for v_item in
        select ci.quantity, p.id as product_id, p.name, p.price
        from public.cart_items ci
        join public.products p on p.id = ci.product_id
        where ci.cart_id = v_cart_id
    loop
        insert into public.order_items (
            order_id, product_id, product_name, unit_price, quantity, line_total
        ) values (
            v_order_id,
            v_item.product_id,
            v_item.name,
            v_item.price,
            v_item.quantity,
            v_item.price * v_item.quantity
        );

        update public.products
        set stock = stock - v_item.quantity,
            sold_count = sold_count + v_item.quantity
        where id = v_item.product_id;
    end loop;

    insert into public.payments (order_id, method, status, amount)
    values (
        v_order_id,
        p_payment_method,
        (case
            when p_payment_method = 'qris' then 'awaiting_verification'
            else 'unpaid'
        end)::public.payment_status,
        v_subtotal
    );

    insert into public.order_status_history (order_id, changed_by, status, note)
    values (v_order_id, v_user_id, 'awaiting_confirmation', 'Pesanan dibuat oleh siswa.');

    delete from public.cart_items where cart_id = v_cart_id;
    return v_order_id;
end;
$$;

revoke all on function public.checkout_cart(
    public.fulfillment_method, text, text, text, text, public.payment_method, uuid
) from public;

grant execute on function public.checkout_cart(
    public.fulfillment_method, text, text, text, text, public.payment_method, uuid
) to authenticated;
