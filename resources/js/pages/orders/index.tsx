import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { kantingo } from '../../lib/kantingo-routes';
import { loadMyOrders, type CustomerOrder } from '@/services/supabase-store';
import { supabase } from '@/lib/supabase';

const rupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
const label = (value: string) =>
    ({
        awaiting_confirmation: 'Menunggu konfirmasi',
        accepted: 'Diterima',
        preparing: 'Sedang disiapkan',
        ready_for_delivery: 'Siap diantar',
        delivering: 'Sedang diantar',
        ready_for_pickup: 'Siap diambil',
        completed: 'Selesai',
        rejected: 'Ditolak',
        cash: 'Tunai',
        qris: 'QRIS',
        unpaid: 'Belum dibayar',
        awaiting_verification: 'Menunggu verifikasi',
        paid: 'Sudah dibayar',
    })[value] ?? value;

export default function OrdersIndex() {
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);

    async function refresh(): Promise<void> {
        try {
            setOrders(await loadMyOrders());
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Riwayat pesanan tidak dapat dimuat.',
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;
        void supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.visit(kantingo.auth.login.url());
                return;
            }
            void refresh();
            channel = supabase
                .channel(`student-orders-${data.user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'orders',
                        filter: `user_id=eq.${data.user.id}`,
                    },
                    () => void refresh(),
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'payments' },
                    () => void refresh(),
                )
                .subscribe();
        });
        return () => {
            if (channel) void supabase.removeChannel(channel);
        };
    }, []);

    return (
        <>
            <Head title="Pesanan saya" />
            <main className="min-h-screen bg-amber-50 px-4 py-8 dark:bg-slate-950">
                <div className="mx-auto max-w-3xl">
                    <Link
                        href={kantingo.home.url()}
                        className="text-sm font-bold text-amber-700"
                    >
                        ← Kembali ke menu
                    </Link>
                    <h1 className="mt-4 text-3xl font-black">
                        Riwayat pesanan
                    </h1>
                    <p className="mt-1 text-slate-500">
                        Status diperbarui otomatis saat petugas memproses
                        pesanan.
                    </p>
                    {loading ? (
                        <div className="mt-6 h-48 animate-pulse rounded-2xl bg-amber-100 dark:bg-slate-900" />
                    ) : (
                        <div className="mt-6 space-y-4">
                            {orders.length === 0 ? (
                                <div className="rounded-2xl bg-white p-10 text-center shadow-sm dark:bg-slate-900">
                                    Belum ada pesanan.{' '}
                                    <Link
                                        href={kantingo.home.url()}
                                        className="font-bold text-amber-700"
                                    >
                                        Mulai pesan
                                    </Link>
                                </div>
                            ) : (
                                orders.map((order) => (
                                    <article
                                        key={order.id}
                                        className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-mono text-xs text-slate-500">
                                                    {order.order_number}
                                                </p>
                                                <h2 className="font-bold">
                                                    {order.items
                                                        .map(
                                                            (item) =>
                                                                `${item.quantity}× ${item.product_name}`,
                                                        )
                                                        .join(', ')}
                                                </h2>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {new Date(
                                                        order.created_at,
                                                    ).toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                {label(order.status)}
                                            </span>
                                        </div>
                                        <div className="mt-4 rounded-xl bg-[#FAF9F5] p-4 dark:bg-slate-800/70">
                                            <p className="text-[10px] font-extrabold tracking-[.12em] text-slate-500">
                                                PROGRES PESANAN · DIPERBARUI OTOMATIS
                                            </p>
                                            {order.status === 'rejected' ? (
                                                <p className="mt-2 text-sm font-bold text-red-600">Pesanan ditolak oleh petugas.</p>
                                            ) : (
                                                <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                    {[
                                                        'awaiting_confirmation',
                                                        'accepted',
                                                        'preparing',
                                                        ...(order.fulfillment_method === 'delivery'
                                                            ? ['ready_for_delivery', 'delivering']
                                                            : ['ready_for_pickup']),
                                                        'completed',
                                                    ].map((step, index, steps) => {
                                                        const currentIndex = steps.indexOf(order.status);
                                                        const isDone = order.status === 'completed' || index < currentIndex;
                                                        const isCurrent = step === order.status;
                                                        const stepLabels: Record<string, string> = {
                                                            awaiting_confirmation: 'Menunggu konfirmasi',
                                                            accepted: 'Pesanan diterima',
                                                            preparing: 'Sedang dibuat',
                                                            ready_for_delivery: 'Siap diantar ke lokasi',
                                                            delivering: 'Sedang diantar',
                                                            ready_for_pickup: 'Siap diambil di kantin',
                                                            completed: 'Pesanan selesai',
                                                        };

                                                        return (
                                                            <li key={step} className="flex items-center gap-2 text-xs">
                                                                <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black ${isDone || isCurrent ? 'bg-[#397A4B] text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'}`}>
                                                                    {isDone ? '✓' : index + 1}
                                                                </span>
                                                                <span className={isCurrent ? 'font-extrabold text-[#397A4B]' : isDone ? 'font-semibold' : 'text-slate-500'}>
                                                                    {stepLabels[step] ?? step}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ol>
                                            )}
                                        </div>
                                        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t pt-4 text-sm dark:border-slate-700">
                                            <span>
                                                {order.fulfillment_method ===
                                                'delivery'
                                                    ? `${order.location_block} · ${order.location_room}`
                                                    : 'Ambil sendiri di kantin'}{' '}
                                                ·{' '}
                                                {order.payment
                                                    ? `${label(order.payment.method)} (${label(order.payment.status)})`
                                                    : 'Pembayaran diproses'}
                                            </span>
                                            <b>{rupiah(order.total)}</b>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
