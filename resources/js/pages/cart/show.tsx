import { Head, Link, router } from '@inertiajs/react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { kantingo } from '../../lib/kantingo-routes';
import { loadCart, productImageUrl, removeCartItem, setCartItemQuantity, type CartItem } from '@/services/supabase-store';
import { supabase } from '@/lib/supabase';

const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function CartShow() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh(): Promise<void> {
        try {
            setItems(await loadCart());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Keranjang tidak dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.visit(kantingo.auth.login.url());
                return;
            }
            void refresh();
        });
    }, []);

    const subtotal = useMemo(() => items.reduce((total, item) => total + item.product.price * item.quantity, 0), [items]);

    async function changeQuantity(item: CartItem, quantity: number): Promise<void> {
        try {
            await setCartItemQuantity(item, quantity);
            await refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Keranjang gagal diperbarui.');
        }
    }

    async function remove(item: CartItem): Promise<void> {
        try {
            await removeCartItem(item.id);
            await refresh();
            toast.success('Produk dihapus dari keranjang.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Produk gagal dihapus.');
        }
    }

    return <><Head title="Keranjang" /><main className="min-h-screen bg-amber-50 px-4 py-8 dark:bg-slate-950"><div className="mx-auto max-w-4xl"><Link href={kantingo.home.url()} className="text-sm font-bold text-amber-700 dark:text-amber-400">← Kembali ke menu</Link><div className="mt-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-400"><ShoppingBag /></span><div><h1 className="text-3xl font-black">Keranjang belanja</h1><p className="text-sm text-slate-500">Harga dan stok akan divalidasi ulang saat checkout.</p></div></div>{loading ? <div className="mt-8 h-60 animate-pulse rounded-2xl bg-amber-100 dark:bg-slate-900" /> : items.length === 0 ? <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm dark:bg-slate-900"><p className="text-lg font-bold">Keranjang masih kosong.</p><Link href={kantingo.home.url()} className="mt-4 inline-block rounded-xl bg-amber-400 px-4 py-2 font-bold">Pilih menu</Link></div> : <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]"><section className="space-y-3">{items.map((item) => { const imageUrl = productImageUrl(item.product.image_path); return <article key={item.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"><div className="grid size-20 place-items-center overflow-hidden rounded-xl bg-amber-100 text-3xl">{imageUrl ? <img className="size-full object-cover" src={imageUrl} alt={item.product.name} /> : '🍱'}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-amber-700">{item.product.category.name}</p><h2 className="font-bold">{item.product.name}</h2><p className="font-black text-amber-700">{rupiah(item.product.price)}</p><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-lg border dark:border-slate-700"><button aria-label="Kurangi jumlah" onClick={() => void changeQuantity(item, item.quantity - 1)} className="p-2"><Minus className="size-4" /></button><span className="w-8 text-center text-sm font-bold">{item.quantity}</span><button aria-label="Tambah jumlah" disabled={item.quantity >= item.product.stock} onClick={() => void changeQuantity(item, item.quantity + 1)} className="p-2 disabled:opacity-30"><Plus className="size-4" /></button></div><button onClick={() => void remove(item)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button></div></div></article>; })}</section><aside className="h-fit rounded-2xl bg-slate-900 p-5 text-white"><h2 className="font-bold">Ringkasan pembayaran</h2><div className="my-4 flex justify-between text-sm text-slate-300"><span>Subtotal</span><span>{rupiah(subtotal)}</span></div><div className="border-t border-slate-700 pt-4"><div className="flex justify-between text-lg font-black"><span>Total</span><span className="text-amber-400">{rupiah(subtotal)}</span></div><Link href={kantingo.checkout.create.url()} className="mt-5 block rounded-xl bg-amber-400 px-4 py-3 text-center font-bold text-slate-950">Lanjut checkout</Link></div></aside></div>}</div></main></>;
}
