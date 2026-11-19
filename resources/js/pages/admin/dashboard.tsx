import { Head, Link } from '@inertiajs/react';
import {
    ChartNoAxesCombined,
    Package,
    ShoppingBasket,
    Users,
} from 'lucide-react';
import { kantingo } from '../../lib/kantingo-routes';

type Props = {
    stats: {
        salesToday: number;
        ordersToday: number;
        products: number;
        students: number;
        staff: number;
        processing: number;
    };
    popularProducts: {
        id: number;
        name: string;
        sold_count: number;
        stock: number;
    }[];
    salesByDay: { label: string; total: number }[];
};
const rupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

export default function AdminDashboard({
    stats,
    popularProducts,
    salesByDay,
}: Props) {
    const cards = [
        [
            'Penjualan hari ini',
            rupiah(stats.salesToday),
            ChartNoAxesCombined,
            'bg-[#FCECE6] text-[#E34B1B]',
        ],
        [
            'Pesanan hari ini',
            stats.ordersToday,
            ShoppingBasket,
            'bg-[#EEF1E7] text-[#397A4B]',
        ],
        [
            'Produk tersedia',
            stats.products,
            Package,
            'bg-[#F6EEDC] text-[#9C7222]',
        ],
        [
            'Siswa terdaftar',
            stats.students,
            Users,
            'bg-[#EDF0F7] text-[#5B6F9B]',
        ],
    ] as const;
    const maxSales = Math.max(...salesByDay.map((day) => day.total), 1);

    return (
        <>
            <Head title="Dashboard Admin — KantinGO" />
            <main className="min-h-screen bg-[#FAF9F5] px-4 py-8 text-[#252920] sm:px-7 dark:bg-[#171a16] dark:text-[#f6f5ef]">
                <div className="mx-auto max-w-[1250px]">
                    <header className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-extrabold tracking-[.18em] text-[#E34B1B]">
                                PUSAT KENDALI KANTINGO
                            </p>
                            <h1 className="mt-1 text-3xl font-black tracking-[-.04em]">
                                Dashboard admin
                            </h1>
                            <p className="mt-1 text-sm text-[#85877D]">
                                Ringkasan aktivitas kantin sekolah.
                            </p>
                        </div>
                        <Link
                            href={kantingo.admin.products.url()}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#E34B1B] px-4 text-sm font-bold text-white transition hover:bg-[#C93D14]"
                        >
                            <Package className="size-4" /> Kelola produk
                        </Link>
                    </header>
                    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map(([title, value, Icon, color]) => (
                            <article
                                key={title}
                                className="rounded-2xl border border-[#EAE7DF] bg-white p-5 dark:border-white/10 dark:bg-white/5"
                            >
                                <div
                                    className={`grid size-10 place-items-center rounded-xl ${color}`}
                                >
                                    <Icon className="size-5" />
                                </div>
                                <p className="mt-4 text-xs font-medium text-[#85877D]">
                                    {title}
                                </p>
                                <p className="mt-1 text-[25px] font-black tracking-tight">
                                    {value}
                                </p>
                            </article>
                        ))}
                    </section>
                    <section className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.85fr]">
                        <article className="rounded-2xl border border-[#EAE7DF] bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-white/5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="font-extrabold">
                                        Penjualan selesai
                                    </h2>
                                    <p className="mt-1 text-xs text-[#85877D]">
                                        Performa 7 hari terakhir
                                    </p>
                                </div>
                                <span className="rounded-lg bg-[#EEF1E7] px-2.5 py-1.5 text-[10px] font-bold text-[#397A4B]">
                                    Hari ini {rupiah(stats.salesToday)}
                                </span>
                            </div>
                            <div className="mt-7 flex h-44 items-end justify-between gap-3 border-b border-[#EAE7DF] px-1 dark:border-white/10">
                                {salesByDay.map((day, index) => (
                                    <div
                                        key={`${day.label}-${index}`}
                                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                                    >
                                        <div
                                            title={rupiah(day.total)}
                                            className={`w-full max-w-12 rounded-t-lg transition-all ${index === salesByDay.length - 1 ? 'bg-[#E34B1B]' : 'bg-[#F4C8B7] dark:bg-white/15'}`}
                                            style={{
                                                height: `${Math.max(5, (day.total / maxSales) * 100)}%`,
                                            }}
                                        />
                                        <span className="pb-2 text-[10px] font-semibold text-[#85877D]">
                                            {day.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-[10px] text-[#85877D]">
                                Nilai hanya menghitung pesanan berstatus
                                selesai.
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#EAE7DF] bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-white/5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="font-extrabold">
                                        Produk terlaris
                                    </h2>
                                    <p className="mt-1 text-xs text-[#85877D]">
                                        Berdasarkan jumlah terjual
                                    </p>
                                </div>
                                <span className="grid size-9 place-items-center rounded-xl bg-[#FCECE6] text-[#E34B1B]">
                                    <ShoppingBasket className="size-4" />
                                </span>
                            </div>
                            <div className="mt-5 divide-y divide-[#F0EEE8] dark:divide-white/10">
                                {popularProducts.map((product, index) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center gap-3 py-3"
                                    >
                                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FAF9F5] text-xs font-black text-[#85877D] dark:bg-white/5">
                                            0{index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold">
                                                {product.name}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-[#85877D]">
                                                Stok tersisa {product.stock}
                                            </p>
                                        </div>
                                        <span className="text-xs font-extrabold text-[#397A4B]">
                                            {product.sold_count} terjual
                                        </span>
                                    </div>
                                ))}
                                {popularProducts.length === 0 && (
                                    <p className="py-9 text-center text-sm text-[#85877D]">
                                        Belum ada data penjualan produk.
                                    </p>
                                )}
                            </div>
                        </article>
                    </section>
                    <section className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-[#EAE7DF] bg-[#EEF1E7] p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[10px] font-bold tracking-wide text-[#85877D]">
                                PESANAN DIPROSES
                            </p>
                            <p className="mt-1 text-2xl font-black text-[#397A4B]">
                                {stats.processing}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#EAE7DF] bg-white p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[10px] font-bold tracking-wide text-[#85877D]">
                                PETUGAS AKTIF
                            </p>
                            <p className="mt-1 text-2xl font-black">
                                {stats.staff}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#EAE7DF] bg-white p-4 dark:border-white/10 dark:bg-white/5">
                            <p className="text-[10px] font-bold tracking-wide text-[#85877D]">
                                TRANSAKSI HARI INI
                            </p>
                            <p className="mt-1 text-2xl font-black">
                                {stats.ordersToday}
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
