-- Initial demo catalog and secure QRIS proof attachment. This is safe to run once.

insert into public.categories (name, slug, icon_name) values
    ('Makanan Berat', 'makanan-berat', 'utensils'),
    ('Makanan Ringan', 'makanan-ringan', 'sandwich'),
    ('Minuman', 'minuman', 'cup-soda'),
    ('Jajanan', 'jajanan', 'cookie')
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, stock, is_available)
select c.id, seed.name, seed.slug, seed.description, seed.price, seed.stock, true
from (values
    ('makanan-berat', 'Nasi Goreng Spesial', 'nasi-goreng-spesial', 'Nasi goreng hangat dengan telur dan kerupuk.', 12000, 20),
    ('makanan-berat', 'Mie Ayam Bakso', 'mie-ayam-bakso', 'Mie ayam gurih dengan bakso.', 10000, 18),
    ('minuman', 'Es Teh Manis', 'es-teh-manis', 'Teh manis dingin yang menyegarkan.', 3000, 50),
    ('minuman', 'Jus Jeruk', 'jus-jeruk', 'Jus jeruk segar pilihan.', 5000, 25),
    ('makanan-ringan', 'Roti Bakar Cokelat', 'roti-bakar-cokelat', 'Roti bakar dengan selai cokelat.', 7000, 15),
    ('jajanan', 'Sosis Bakar', 'sosis-bakar', 'Sosis panggang dengan saus pilihan.', 5000, 30)
) as seed(category_slug, name, slug, description, price, stock)
join public.categories c on c.slug = seed.category_slug
on conflict (slug) do nothing;

create or replace function public.attach_payment_proof(p_order_id uuid, p_proof_path text)
returns void
language plpgsql security definer set search_path = public as $$
begin
    if not exists (select 1 from public.orders where id = p_order_id and user_id = auth.uid()) then
        raise exception 'Pesanan tidak ditemukan atau bukan milik Anda';
    end if;

    if split_part(p_proof_path, '/', 1) <> auth.uid()::text then
        raise exception 'Lokasi bukti pembayaran tidak valid';
    end if;

    update public.payments
    set proof_path = p_proof_path
    where order_id = p_order_id and method = 'qris' and status = 'awaiting_verification';

    if not found then
        raise exception 'Bukti hanya dapat diunggah untuk pembayaran QRIS yang menunggu verifikasi';
    end if;
end;
$$;

revoke all on function public.attach_payment_proof from public;
grant execute on function public.attach_payment_proof to authenticated;
