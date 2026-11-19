import { Head, Link, router } from '@inertiajs/react';
import {
    Bike,
    Check,
    Clock3,
    MapPin,
    PackageCheck,
    ShoppingBag,
} from 'lucide-react';
import { kantingo } from '../../lib/kantingo-routes';
import StaffAccountActions from '../../components/staff-account-actions';

type Status =
    | 'awaiting_confirmation'
    | 'accepted'
    | 'preparing'
    | 'ready_for_delivery'
    | 'delivering'
    | 'ready_for_pickup'
    | 'completed'
    | 'rejected';
type Order = {
    id: number;
    order_number: string;
    status: Status;
    fulfillment_method: 'delivery' | 'pickup';
    location_block: string | null;
    location_room: string | null;
    location_note: string | null;
    order_note: string | null;
    total: number;
    created_at?: string;
    customer: { name: string; nis: string; class_name: string | null };
    items: { id: number; product_name: string; quantity: number }[];
    payment: { method: string; status: string };
};
type Props = { orders: Order[] };
const rupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
const statusLabels: Record<Status, string> = {
    awaiting_confirmation: 'Menunggu konfirmasi',
    accepted: 'Diterima',
    preparing: 'Sedang disiapkan',
    ready_for_delivery: 'Siap diantar',
    delivering: 'Sedang diantar',
    ready_for_pickup: 'Siap diambil',
    completed: 'Selesai',
    rejected: 'Ditolak',
};
function next(order: Order): { value: Status; label: string } | null {
    const transitions: Record<Status, { value: Status; label: string } | null> =
        {
            awaiting_confirmation: {
                value: 'accepted',
                label: 'Terima pesanan',
            },
            accepted: { value: 'preparing', label: 'Mulai persiapan' },
            preparing:
                order.fulfillment_method === 'delivery'
                    ? { value: 'ready_for_delivery', label: 'Siap diantar' }
                    : { value: 'ready_for_pickup', label: 'Siap diambil' },
            ready_for_delivery: {
                value: 'delivering',
                label: 'Sedang diantar',
            },
            delivering: { value: 'completed', label: 'Selesaikan pesanan' },
            ready_for_pickup: {
                value: 'completed',
                label: 'Selesaikan pesanan',
            },
            completed: null,
            rejected: null,
        };

    return transitions[order.status];
}

export default function StaffOrders({ orders }: Props) {
    const pending = orders.filter(
        (order) => order.status === 'awaiting_confirmation',
    ).length;
    const processing = orders.filter((order) =>
        [
            'accepted',
            'preparing',
            'ready_for_delivery',
            'delivering',
            'ready_for_pickup',
        ].includes(order.status),
    ).length;
    const completed = orders.filter(
        (order) => order.status === 'completed',
    ).length;
    const cards = [
        ['Pesanan hari ini', orders.length, ShoppingBag],
        ['Menunggu konfirmasi', pending, Clock3],
        ['Sedang diproses', processing, Bike],
        ['Selesai', completed, PackageCheck],
    ] as const;

    function reject(order: Order): void {
        const reason = window.prompt('Tuliskan alasan penolakan pesanan:');
        if (!reason?.trim()) return;
        router.patch(kantingo.staff.status.url(order.id), {
            status: 'rejected',
            note: reason.trim(),
        });
    }

    return (
        <>
            <Head title="Pesanan Petugas — KantinGO" />
            <main className="min-h-screen bg-[#FAF9F5] px-4 py-8 text-[#252920] sm:px-7 dark:bg-[#171a16] dark:text-[#f6f5ef]">
                <div className="mx-auto max-w-[1250px]">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="grid size-12 place-items-center rounded-2xl bg-[#E34B1B] text-white">
                                <Bike className="size-6" />
                            </span>
                            <div>
                                <p className="text-[10px] font-extrabold tracking-[.18em] text-[#E34B1B]">
                                    RUANG OPERASIONAL
                                </p>
                                <h1 className="text-3xl font-black tracking-[-.04em]">
                                    Pesanan kantin
                                </h1>
                                <p className="text-sm text-[#85877D]">
                                    Terima dan siapkan pesanan siswa.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={kantingo.staff.menu.url()}
                                className="rounded-xl bg-[#242A21] px-4 py-2.5 text-xs font-bold text-white"
                            >
                                Kelola menu
                            </Link>
                            <Link
                                href={kantingo.staff.storeSettings.url()}
                                className="rounded-xl border border-[#EAE7DF] bg-white px-4 py-2.5 text-xs font-bold dark:border-white/10 dark:bg-white/5"
                            >
                                Jam & status kantin
                            </Link>
                            <div className="rounded-xl border border-[#EAE7DF] bg-white px-4 py-2.5 text-xs font-semibold text-[#85877D] dark:border-white/10 dark:bg-white/5">
                                {new Date().toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                })}
                            </div>
                            <StaffAccountActions />
                        </div>
                    </header>
                    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map(([title, count, Icon], index) => (
                            <article
                                key={title}
                                className="flex items-center gap-3 rounded-2xl border border-[#EAE7DF] bg-white p-4 dark:border-white/10 dark:bg-white/5"
                            >
                                <span
                                    className={`grid size-10 place-items-center rounded-xl ${index === 1 ? 'bg-[#FCECE6] text-[#E34B1B]' : 'bg-[#EEF1E7] text-[#397A4B]'}`}
                                >
                                    <Icon className="size-5" />
                                </span>
                                <div>
                                    <p className="text-[10px] font-bold text-[#85877D]">
                                        {title}
                                    </p>
                                    <p className="mt-0.5 text-xl font-black">
                                        {count}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </section>
                    <div className="mt-8 flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black">
                                Daftar pesanan
                            </h2>
                            <p className="mt-1 text-xs text-[#85877D]">
                                Pesanan terbaru berada di bagian atas.
                            </p>
                        </div>
                        <span className="rounded-lg bg-[#EEF1E7] px-3 py-1.5 text-[10px] font-bold text-[#397A4B]">
                            {orders.length} pesanan
                        </span>
                    </div>
                    <section className="mt-4 grid gap-4 xl:grid-cols-2">
                        {orders.map((order) => {
                            const action = next(order);
                            return (
                                <article
                                    key={order.id}
                                    className="overflow-hidden rounded-2xl border border-[#EAE7DF] bg-white dark:border-white/10 dark:bg-white/5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0EEE8] p-5 dark:border-white/10">
                                        <div>
                                            <p className="font-mono text-[10px] font-semibold text-[#85877D]">
                                                {order.order_number}
                                            </p>
                                            <h3 className="mt-1 font-extrabold">
                                                {order.customer.name}
                                            </h3>
                                            <p className="mt-0.5 text-xs text-[#85877D]">
                                                NIS {order.customer.nis} ·{' '}
                                                {order.customer.class_name ||
                                                    'Kelas belum diisi'}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${order.status === 'completed' ? 'bg-[#EEF1E7] text-[#397A4B]' : order.status === 'rejected' ? 'bg-[#FCECE6] text-[#D83D32]' : 'bg-[#F6EEDC] text-[#8A6520]'}`}
                                        >
                                            {statusLabels[order.status]}
                                        </span>
                                    </div>
                                    {order.fulfillment_method === 'delivery' ? (
                                        <div className="mx-5 mt-4 rounded-xl border border-[#D9E3D2] bg-[#EEF1E7] p-4 dark:border-white/10 dark:bg-[#397A4B]/10">
                                            <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.12em] text-[#397A4B]">
                                                <MapPin className="size-4" />{' '}
                                                LOKASI PENGANTARAN
                                            </div>
                                            <p className="mt-2 text-sm font-black">
                                                {order.location_block?.toUpperCase()}{' '}
                                                <span className="mx-1 text-[#85877D]">
                                                    /
                                                </span>{' '}
                                                {order.location_room}
                                            </p>
                                            {order.location_note && (
                                                <p className="mt-1 text-xs text-[#65695f] dark:text-white/65">
                                                    Catatan lokasi:{' '}
                                                    {order.location_note}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-[#F6EEDC] p-3 text-xs font-bold text-[#8A6520]">
                                            <ShoppingBag className="size-4" />{' '}
                                            Diambil sendiri di kantin
                                        </div>
                                    )}
                                    <div className="px-5 pt-4">
                                        <p className="text-sm leading-6 font-semibold">
                                            {order.items
                                                .map(
                                                    (item) =>
                                                        `${item.quantity}× ${item.product_name}`,
                                                )
                                                .join(' · ')}
                                        </p>
                                        {order.order_note && (
                                            <p className="mt-2 text-xs text-[#85877D]">
                                                Catatan pesanan:{' '}
                                                {order.order_note}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EEE8] py-4 text-xs dark:border-white/10">
                                        <span className="font-semibold text-[#85877D]">
                                            {order.payment.method.toUpperCase()}{' '}
                                            ·{' '}
                                            {order.payment.status.replaceAll(
                                                '_',
                                                ' ',
                                            )}
                                        </span>
                                        <b className="text-sm">
                                            {rupiah(order.total)}
                                        </b>
                                    </div>
                                    <div className="grid gap-2 px-5 pb-5">
                                        {order.payment.status ===
                                            'awaiting_verification' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() =>
                                                        router.patch(
                                                            kantingo.staff.payment.url(
                                                                order.id,
                                                            ),
                                                            { status: 'paid' },
                                                        )
                                                    }
                                                    className="rounded-xl bg-[#397A4B] px-3 py-2.5 text-xs font-bold text-white"
                                                >
                                                    <Check className="mr-1 inline size-3.5" />{' '}
                                                    Verifikasi QRIS
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        router.patch(
                                                            kantingo.staff.payment.url(
                                                                order.id,
                                                            ),
                                                            {
                                                                status: 'rejected',
                                                                rejection_reason:
                                                                    'Bukti pembayaran belum dapat diverifikasi.',
                                                            },
                                                        )
                                                    }
                                                    className="rounded-xl border border-[#D83D32]/30 px-3 py-2.5 text-xs font-bold text-[#D83D32]"
                                                >
                                                    Tolak bukti
                                                </button>
                                            </div>
                                        )}
                                        {action && (
                                            <button
                                                onClick={() =>
                                                    router.patch(
                                                        kantingo.staff.status.url(
                                                            order.id,
                                                        ),
                                                        {
                                                            status: action.value,
                                                        },
                                                    )
                                                }
                                                className="w-full rounded-xl bg-[#E34B1B] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#C93D14]"
                                            >
                                                {action.label}
                                            </button>
                                        )}
                                        {order.status ===
                                            'awaiting_confirmation' && (
                                            <button
                                                onClick={() => reject(order)}
                                                className="w-full rounded-xl border border-[#D83D32]/25 px-4 py-2.5 text-xs font-bold text-[#D83D32] hover:bg-[#FCECE6]"
                                            >
                                                Tolak pesanan
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                    {orders.length === 0 && (
                        <div className="mt-4 rounded-2xl border border-dashed border-[#D8D5CC] bg-white px-5 py-16 text-center dark:border-white/15 dark:bg-white/5">
                            <ShoppingBag className="mx-auto size-7 text-[#b8b5aa]" />
                            <p className="mt-3 font-bold">
                                Belum ada pesanan masuk
                            </p>
                            <p className="mt-1 text-sm text-[#85877D]">
                                Pesanan baru siswa akan muncul di halaman ini.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
