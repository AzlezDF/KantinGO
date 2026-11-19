import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { kantingo } from '../../lib/kantingo-routes';
import { checkoutCart, loadCart, loadStoreSettings, uploadPaymentProof, type CartItem } from '@/services/supabase-store';
import { supabase } from '@/lib/supabase';

const rupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function CheckoutCreate() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(true);
    const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
    const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
    const [locationBlock, setLocationBlock] = useState('Teori');
    const [locationRoom, setLocationRoom] = useState('');
    const [locationNote, setLocationNote] = useState('');
    const [orderNote, setOrderNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const total = useMemo(() => items.reduce((amount, item) => amount + item.quantity * item.product.price, 0), [items]);

    useEffect(() => {
        void supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.visit(kantingo.auth.login.url());
                return;
            }
            void Promise.all([loadCart(), loadStoreSettings()]).then(([cart, settings]) => {
                setItems(cart);
                setIsOpen(settings.isOpen);
                setQrisImageUrl(settings.qrisImageUrl);
            }).catch((error: Error) => toast.error(error.message)).finally(() => setLoading(false));
        });
    }, []);

    async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (fulfillmentMethod === 'delivery' && !locationRoom.trim()) {
            toast.error('Ruang pengantaran wajib diisi.');
            return;
        }
        if (paymentMethod === 'qris' && !paymentProof) {
            toast.error('Unggah bukti pembayaran QRIS terlebih dahulu.');
            return;
        }
        if (!isOpen || processing) return;

        setProcessing(true);
        try {
            const orderId = await checkoutCart({ fulfillmentMethod, locationBlock, locationRoom, locationNote, orderNote, paymentMethod, idempotencyKey: crypto.randomUUID() });
            if (paymentProof) await uploadPaymentProof(orderId, paymentProof);
            toast.success('Pesanan berhasil dibuat dan menunggu konfirmasi petugas.');
            router.visit(kantingo.orders.url());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Pesanan gagal dibuat.');
        } finally {
            setProcessing(false);
        }
    }

    if (loading) return <main className="min-h-screen bg-amber-50 p-8 dark:bg-slate-950"><div className="mx-auto h-80 max-w-3xl animate-pulse rounded-2xl bg-amber-100 dark:bg-slate-900" /></main>;
    if (!items.length) return <><Head title="Checkout" /><main className="min-h-screen p-10 text-center dark:bg-slate-950"><p>Keranjang Anda kosong.</p><Link href={kantingo.home.url()} className="mt-4 inline-block font-bold text-amber-700">Kembali ke menu</Link></main></>;

    return <><Head title="Checkout" /><main className="min-h-screen bg-amber-50 px-4 py-8 dark:bg-slate-950"><div className="mx-auto max-w-3xl"><Link href={kantingo.cart.show.url()} className="text-sm font-bold text-amber-700">← Kembali ke keranjang</Link><h1 className="mt-4 text-3xl font-black">Lengkapi pesanan</h1>{!isOpen && <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircle className="size-5 shrink-0" />Kantin sedang tutup. Katalog tetap dapat dilihat, tetapi checkout dinonaktifkan.</div>}<form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-6 md:grid-cols-[1fr_18rem]"><section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"><div><div className="flex items-center gap-2"><MapPin className="size-5 text-amber-600" /><h2 className="font-black">Lokasi penerimaan</h2></div><div className="mt-4 grid gap-3"><label className="text-sm font-semibold">Metode penerimaan<select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as 'delivery' | 'pickup')} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option value="delivery">Diantar ke lokasi</option><option value="pickup">Ambil sendiri di kantin</option></select></label>{fulfillmentMethod === 'delivery' && <><label className="text-sm font-semibold">Blok<select value={locationBlock} onChange={(event) => setLocationBlock(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950"><option>Teori</option><option>Bengkel</option><option>Lokasi lainnya</option></select></label><label className="text-sm font-semibold">Ruang<input value={locationRoom} onChange={(event) => setLocationRoom(event.target.value)} placeholder="Contoh: XI TKJ 2" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" /></label><label className="text-sm font-semibold">Catatan lokasi<textarea value={locationNote} onChange={(event) => setLocationNote(event.target.value)} placeholder="Dekat pintu masuk…" className="mt-1 min-h-20 w-full rounded-lg border p-2 dark:bg-slate-950" /></label></>}</div></div><div className="border-t pt-5 dark:border-slate-700"><h2 className="font-black">Pembayaran</h2><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPaymentMethod('cash')} className={`rounded-xl border p-3 text-left ${paymentMethod === 'cash' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}><b>Tunai</b><br /><span className="text-xs text-slate-500">Bayar saat diterima/diambil.</span></button><button type="button" onClick={() => setPaymentMethod('qris')} className={`rounded-xl border p-3 text-left ${paymentMethod === 'qris' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}><b>QRIS</b><br /><span className="text-xs text-slate-500">Menunggu verifikasi petugas.</span></button></div>{paymentMethod === 'qris' && <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-sm font-semibold">Bayar tepat sejumlah {rupiah(total)}</p>{qrisImageUrl ? <img src={qrisImageUrl} className="mx-auto mt-3 size-40 object-contain" alt="Kode QRIS KantinGO" /> : <p className="mt-2 text-sm text-amber-700">Admin belum mengunggah gambar QRIS.</p>}<label className="mt-3 block text-sm font-semibold">Bukti pembayaran<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)} className="mt-1 block text-sm" /></label></div>}</div><label className="block border-t pt-5 text-sm font-semibold dark:border-slate-700">Catatan pesanan<textarea value={orderNote} onChange={(event) => setOrderNote(event.target.value)} placeholder="Contoh: tidak pedas, tanpa saus" className="mt-1 min-h-20 w-full rounded-lg border p-2 dark:bg-slate-950" /></label></section><aside className="h-fit rounded-2xl bg-slate-900 p-5 text-white"><h2 className="font-bold">Pesanan Anda</h2><div className="my-4 space-y-2 text-sm text-slate-300">{items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.quantity}× {item.product.name}</span><span>{rupiah(item.quantity * item.product.price)}</span></div>)}</div><div className="border-t border-slate-700 pt-4"><div className="flex justify-between font-black"><span>Total</span><span className="text-amber-400">{rupiah(total)}</span></div><button disabled={!isOpen || processing} className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{processing ? 'Memproses…' : 'Buat pesanan'}</button></div></aside></form></div></main></>;
}
