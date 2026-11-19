-- Laravel staff accounts are separate from Supabase Auth. This RPC is callable
-- only with the server-side Supabase secret key and validates every transition
-- while locking the order row.
create or replace function public.staff_transition_order_status(
    p_order_id uuid,
    p_status public.order_status,
    p_note text default null,
    p_staff_name text default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
    v_order public.orders;
    v_is_valid boolean := false;
    v_history_note text;
begin
    if current_user <> 'service_role' then
        raise exception 'Aksi hanya diizinkan dari server KantinGO';
    end if;

    select * into v_order
    from public.orders
    where id = p_order_id
    for update;

    if v_order.id is null then
        raise exception 'Pesanan tidak ditemukan';
    end if;

    if not exists (
        select 1 from public.payments
        where order_id = p_order_id and method = 'cash'
    ) then
        raise exception 'Alur petugas ini khusus untuk pesanan tunai';
    end if;

    v_is_valid := (v_order.status = 'awaiting_confirmation' and p_status in ('accepted', 'rejected'))
        or (v_order.status = 'accepted' and p_status in ('preparing', 'rejected'))
        or (v_order.status = 'preparing' and ((v_order.fulfillment_method = 'delivery' and p_status = 'ready_for_delivery') or (v_order.fulfillment_method = 'pickup' and p_status = 'ready_for_pickup')))
        or (v_order.status = 'ready_for_delivery' and p_status = 'delivering')
        or (v_order.status in ('delivering', 'ready_for_pickup') and p_status = 'completed');

    if not v_is_valid then
        raise exception 'Perubahan status tidak valid untuk metode penerimaan pesanan ini';
    end if;

    update public.orders
    set status = p_status
    where id = p_order_id;

    v_history_note := concat_ws(
        ': ',
        case when nullif(trim(p_staff_name), '') is not null
            then 'Diproses petugas ' || trim(p_staff_name)
            else 'Diproses petugas kantin'
        end,
        nullif(trim(p_note), '')
    );

    insert into public.order_status_history (order_id, changed_by, status, note)
    values (p_order_id, null, p_status, v_history_note);
end;
$$;

revoke all on function public.staff_transition_order_status(uuid, public.order_status, text, text)
    from public, anon, authenticated;
grant execute on function public.staff_transition_order_status(uuid, public.order_status, text, text)
    to service_role;
