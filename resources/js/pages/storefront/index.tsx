import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Clock3,
    Coffee,
    MapPin,
    Search,
    ShoppingBag,
    Sparkles,
    Utensils,
    Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
    addProductToCart,
    loadCatalog,
    loadMyOrders,
    loadStoreSettings,
    productImageUrl,
    type Category,
    type CustomerOrder,
    type Product,
} from '@/services/supabase-store';
import { show as cartRoute } from '@/routes/cart';
import { index as ordersRoute } from '@/routes/orders';
import { edit as profileRoute } from '@/routes/profile';
import type { Auth } from '@/types';

const rupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);

export default function Storefront() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        null,
    );
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const [isOpen, setIsOpen] = useState(true);
    const [operatingHours, setOperatingHours] = useState('07:00–15:30');
    const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(null);

    useEffect(() => {
        void Promise.all([loadCatalog(), loadStoreSettings()])
            .then(([catalog, settings]) => {
                setCategories(catalog.categories);
                setProducts(catalog.products);
                setIsOpen(settings.isOpen);
                setOperatingHours(
                    `${settings.openingTime}–${settings.closingTime}`,
                );
            })
            .catch((error: Error) =>
                toast.error(`Menu belum dapat dimuat: ${error.message}`),
            )
            .finally(() => setLoading(false));
        const settingsChannel = supabase
            .channel('student-store-settings')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'store_settings' },
                () => {
                    void loadStoreSettings()
                        .then((settings) => {
                            setIsOpen(settings.isOpen);
                            setOperatingHours(
                                `${settings.openingTime}–${settings.closingTime}`,
                            );
                        })
                        .catch(() =>
                            toast.error(
                                'Status operasional kantin gagal diperbarui.',
                            ),
                        );
                },
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                () => {
                    void loadCatalog()
                        .then((catalog) => {
                            setCategories(catalog.categories);
                            setProducts(catalog.products);
                        })
                        .catch(() =>
                            toast.error('Menu kantin gagal diperbarui.'),
                        );
                },
            )
            .subscribe();
        let orderChannel: ReturnType<typeof supabase.channel> | null = null;
        void supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                const refreshActiveOrder = () => {
                    void loadMyOrders()
                        .then((orders) => {
                            setActiveOrder(
                                orders.find(
                                    (order) => !['completed', 'rejected'].includes(order.status),
                                ) ?? null,
                            );
                        })
                        .catch(() => undefined);
                };

                refreshActiveOrder();
                orderChannel = supabase
                    .channel(`student-dashboard-orders-${data.user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'orders',
                            filter: `user_id=eq.${data.user.id}`,
                        },
                        refreshActiveOrder,
                    )
                    .subscribe();

                void supabase
                    .from('carts')
                    .select('cart_items(quantity)')
                    .eq('user_id', data.user.id)
                    .maybeSingle()
                    .then(({ data: cart }) => {
                        setCartCount(
                            (cart?.cart_items ?? []).reduce(
                                (total, item) => total + item.quantity,
                                0,
                            ),
                        );
                    });
            }
        });
        return () => {
            void supabase.removeChannel(settingsChannel);
            if (orderChannel) {
                void supabase.removeChannel(orderChannel);
            }
        };
    }, []);

    const visibleProducts = useMemo(
        () =>
            products.filter((product) => {
                const matchesCategory =
                    !selectedCategory ||
                    product.category.id === selectedCategory;
                const needle = search.trim().toLowerCase();
                return (
                    matchesCategory &&
                    (!needle ||
                        product.name.toLowerCase().includes(needle) ||
                        product.category.name.toLowerCase().includes(needle))
                );
            }),
        [products, search, selectedCategory],
    );

    async function addToCart(product: Product): Promise<void> {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
            toast.error(
                'Sesi pemesanan belum terhubung. Silakan masuk kembali.',
            );
            return;
        }
        try {
            await addProductToCart(product);
            setCartCount((count) => count + 1);
            toast.success(`${product.name} masuk ke keranjang.`);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Produk gagal ditambahkan.',
            );
        }
    }

    return (
        <>
            <Head title="Menu Hari Ini — KantinGO" />
            <div className="min-h-screen bg-[#FAF9F5] text-[#252920] dark:bg-[#171a16] dark:text-[#f6f5ef]">
                <header className="sticky top-0 z-30 border-b border-[#EAE7DF] bg-[#FAF9F5]/95 backdrop-blur dark:border-white/10 dark:bg-[#171a16]/95">
                    <nav className="mx-auto flex h-[72px] max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-7">
                        <Link
                            href="/"
                            className="flex shrink-0 items-center gap-2.5"
                        >
                            <span className="grid size-10 place-items-center rounded-[14px] bg-[#E34B1B] text-white">
                                <Utensils className="size-5" />
                            </span>
                            <span className="text-xl font-black tracking-tight">
                                Kantin<span className="text-[#E34B1B]">GO</span>
                                <small className="ml-2 hidden text-[10px] font-semibold tracking-wide text-[#85877D] sm:inline">
                                    SMKN 1 ADIWERNA
                                </small>
                            </span>
                        </Link>
                        <div className="hidden items-center gap-8 text-[13px] font-semibold text-[#72756b] md:flex">
                            <a
                                href="#menu"
                                className="text-[#242A21] hover:text-[#E34B1B] dark:text-white"
                            >
                                Menu Hari Ini
                            </a>
                            <a
                                href="#cara-pesan"
                                className="hover:text-[#E34B1B]"
                            >
                                Cara Pesan
                            </a>
                            <Link
                                href={ordersRoute.url()}
                                className="hover:text-[#E34B1B]"
                            >
                                Pesanan Saya
                            </Link>
                            <a
                                href="mailto:kantin@smkn1adiwerna.sch.id"
                                className="hover:text-[#E34B1B]"
                            >
                                Chat Petugas
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={cartRoute.url()}
                                className="relative grid size-10 place-items-center rounded-xl border border-[#EAE7DF] bg-white transition hover:border-[#E34B1B]/40 dark:border-white/10 dark:bg-white/5"
                                aria-label="Keranjang"
                            >
                                <ShoppingBag className="size-[18px]" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-[#E34B1B] text-[10px] font-bold text-white">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                href={profileRoute.url()}
                                className="hidden items-center gap-2 border-l border-[#EAE7DF] pl-3 sm:flex dark:border-white/10"
                            >
                                <span className="grid size-9 place-items-center rounded-full bg-[#EEF1E7] text-sm font-bold text-[#397A4B] uppercase">
                                    {auth.user.name.slice(0, 1)}
                                </span>
                                <span className="max-w-32 truncate text-xs font-semibold">
                                    {auth.user.name}
                                    <small className="block text-[10px] font-normal text-[#85877D]">
                                        Profil siswa
                                    </small>
                                </span>
                            </Link>
                        </div>
                    </nav>
                </header>
                <main className="mx-auto max-w-[1360px] px-4 pt-7 pb-16 sm:px-7">
                    <section className="relative isolate overflow-hidden rounded-[26px] bg-[#242A21] text-white shadow-[0_14px_50px_rgba(36,42,33,.12)]">
                        <div className="absolute -top-28 -right-16 -z-10 size-[440px] rounded-full bg-[#E34B1B]/20 blur-3xl" />
                        <div className="grid min-h-[320px] items-center md:grid-cols-[1.1fr_.9fr]">
                            <div className="px-7 py-10 sm:px-12 sm:py-12">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[.15em] text-[#f6d5c9]">
                                    <Sparkles className="size-3.5 text-[#F2A17F]" />{' '}
                                    ISTIRAHAT MAKIN NIKMAT
                                </span>
                                <h1 className="mt-5 max-w-[570px] text-[36px] leading-[1.08] font-black tracking-[-.04em] sm:text-[50px]">
                                    Perut kenyang,
                                    <br />
                                    belajar jadi{' '}
                                    <span className="text-[#F28B63]">
                                        tenang.
                                    </span>
                                </h1>
                                <p className="mt-4 max-w-[470px] text-sm leading-6 text-white/65 sm:text-[15px]">
                                    Menu favorit kantin sekolah, tinggal klik
                                    dan ambil. Lebih praktis, nggak perlu
                                    buru-buru antre.
                                </p>
                                <a
                                    href="#menu"
                                    className="mt-7 inline-flex h-12 items-center gap-3 rounded-xl bg-[#E34B1B] px-5 text-sm font-bold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#C93D14]"
                                >
                                    Yuk, pilih menu{' '}
                                    <ArrowRight className="size-4" />
                                </a>
                                <p className="mt-5 flex items-center gap-2 text-xs text-white/55">
                                    <Wallet className="size-4 text-[#F28B63]" />{' '}
                                    Jajanan enak dengan harga ramah kantong
                                </p>
                            </div>
                            <div className="relative hidden h-full min-h-[320px] items-center justify-center md:flex">
                                <div className="absolute top-[13%] right-[12%] size-[250px] rounded-full border border-white/10" />
                                <div className="absolute top-[20%] right-[17%] size-[210px] rounded-full bg-[#F6EEDC]" />
                                <div className="relative z-10 mr-10 rotate-[-5deg] text-[170px] drop-shadow-2xl">
                                    🍱
                                </div>
                                <div className="absolute right-9 bottom-9 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                                    <p className="text-[10px] font-bold tracking-wide text-white/60">
                                        PILIHAN HARI INI
                                    </p>
                                    <p className="mt-1 text-sm font-bold">
                                        Menu segar, siap dinikmati
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="mt-5 grid gap-3 rounded-2xl border border-[#EAE7DF] bg-white p-4 sm:grid-cols-3 sm:items-center sm:px-6 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-3">
                            <span
                                className={`grid size-10 place-items-center rounded-xl ${isOpen ? 'bg-[#EEF1E7] text-[#397A4B]' : 'bg-[#fbe9e6] text-[#D83D32]'}`}
                            >
                                <span
                                    className={`size-2.5 rounded-full ${isOpen ? 'bg-[#397A4B]' : 'bg-[#D83D32]'}`}
                                />
                            </span>
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-[#85877D]">
                                    STATUS KANTIN
                                </p>
                                <p
                                    className={`mt-0.5 text-sm font-bold ${isOpen ? 'text-[#397A4B]' : 'text-[#D83D32]'}`}
                                >
                                    {isOpen
                                        ? 'Buka — siap menerima pesanan'
                                        : 'Tutup sementara'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:justify-center">
                            <Clock3 className="size-5 text-[#E34B1B]" />
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-[#85877D]">
                                    JAM OPERASIONAL
                                </p>
                                <p className="mt-0.5 text-sm font-semibold">
                                    Setiap hari sekolah · {operatingHours} WIB
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:justify-end">
                            <MapPin className="size-5 text-[#E34B1B]" />
                            <div>
                                <p className="text-[10px] font-bold tracking-wider text-[#85877D]">
                                    PEMESANAN
                                </p>
                                <p className="mt-0.5 text-sm font-semibold">
                                    Ambil sendiri atau antar ke kelas
                                </p>
                            </div>
                        </div>
                    </section>
                    {activeOrder && (
                        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F0D1C4] bg-[#FFF5F0] p-4 dark:border-[#E34B1B]/30 dark:bg-[#E34B1B]/10 sm:px-6">
                            <div>
                                <p className="text-[10px] font-extrabold tracking-[.14em] text-[#E34B1B]">PESANAN SEDANG DIPROSES</p>
                                <p className="mt-1 text-sm font-black">
                                    {activeOrder.order_number} · {activeOrder.status === 'awaiting_confirmation' ? 'Menunggu konfirmasi' : activeOrder.status === 'accepted' ? 'Pesanan diterima' : activeOrder.status === 'preparing' ? 'Sedang dibuat' : activeOrder.status === 'ready_for_delivery' ? 'Siap diantar' : activeOrder.status === 'delivering' ? 'Sedang diantar' : activeOrder.status === 'ready_for_pickup' ? 'Siap diambil di kantin' : activeOrder.status}
                                </p>
                                <p className="mt-1 text-xs text-[#85877D]">
                                    {activeOrder.fulfillment_method === 'delivery'
                                        ? `Diantar ke ${activeOrder.location_block ?? 'lokasi'} · ${activeOrder.location_room ?? ''}`
                                        : 'Ambil sendiri di kantin'}
                                </p>
                            </div>
                            <Link href={ordersRoute.url()} className="rounded-xl bg-[#E34B1B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C93D14]">
                                Lihat progres pesanan
                            </Link>
                        </section>
                    )}
                    <section id="menu" className="mt-10 scroll-mt-24">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="text-[10px] font-extrabold tracking-[.18em] text-[#E34B1B]">
                                    DIBUAT DENGAN HANGAT
                                </p>
                                <h2 className="mt-1 text-[27px] font-black tracking-[-.035em]">
                                    Menu kantin hari ini
                                </h2>
                                <p className="mt-1 text-sm text-[#85877D]">
                                    Pilih yang kamu suka, kami siapkan untukmu.
                                </p>
                            </div>
                            <label className="relative block w-full md:max-w-[330px]">
                                <Search className="absolute top-3.5 left-4 size-4 text-[#85877D]" />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Cari makanan atau minuman"
                                    className="h-12 w-full rounded-xl border border-[#EAE7DF] bg-white pr-4 pl-11 text-sm transition outline-none focus:border-[#E34B1B]/50 focus:ring-4 focus:ring-[#E34B1B]/10 dark:border-white/10 dark:bg-white/5"
                                />
                            </label>
                        </div>
                        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                            {[
                                {
                                    id: null,
                                    name: 'Semua menu',
                                    icon: Utensils,
                                },
                                ...categories.map((category) => ({
                                    id: category.id,
                                    name: category.name,
                                    icon: category.slug.includes('minum')
                                        ? Coffee
                                        : Utensils,
                                })),
                            ].map((category) => {
                                const Icon = category.icon;
                                const active = selectedCategory === category.id;
                                return (
                                    <button
                                        key={category.id ?? 'all'}
                                        onClick={() =>
                                            setSelectedCategory(category.id)
                                        }
                                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${active ? 'bg-[#242A21] text-white dark:bg-[#E34B1B]' : 'border border-[#EAE7DF] bg-white text-[#686b62] hover:border-[#E34B1B]/40 dark:border-white/10 dark:bg-white/5 dark:text-white/70'}`}
                                    >
                                        <Icon className="size-4" />
                                        {category.name}
                                    </button>
                                );
                            })}
                        </div>
                        {loading ? (
                            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {Array.from({ length: 8 }, (_, index) => (
                                    <div
                                        key={index}
                                        className="h-[300px] animate-pulse rounded-2xl bg-[#F6EEDC] dark:bg-white/5"
                                    />
                                ))}
                            </div>
                        ) : visibleProducts.length === 0 ? (
                            <div className="mt-5 rounded-2xl border border-dashed border-[#D8D5CC] bg-white px-5 py-16 text-center dark:border-white/15 dark:bg-white/5">
                                <Utensils className="mx-auto size-7 text-[#b8b5aa]" />
                                <p className="mt-3 font-bold">
                                    {products.length === 0
                                        ? 'Menu sedang disiapkan'
                                        : 'Menu tidak ditemukan'}
                                </p>
                                <p className="mt-1 text-sm text-[#85877D]">
                                    {products.length === 0
                                        ? 'Silakan cek kembali saat kantin sudah menambahkan produk.'
                                        : 'Coba kata kunci atau kategori lainnya.'}
                                </p>
                            </div>
                        ) : (
                            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {visibleProducts.map((product) => {
                                    const imageUrl = productImageUrl(
                                        product.image_path,
                                    );
                                    return (
                                        <article
                                            key={product.id}
                                            className="group overflow-hidden rounded-2xl border border-[#EAE7DF] bg-white transition duration-200 hover:-translate-y-1 hover:border-[#E34B1B]/25 hover:shadow-[0_15px_35px_rgba(36,42,33,.08)] dark:border-white/10 dark:bg-white/5"
                                        >
                                            <div className="relative aspect-[1.45] overflow-hidden bg-[#F6EEDC] dark:bg-white/5">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={product.name}
                                                        className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                                    />
                                                ) : (
                                                    <div className="grid size-full place-items-center text-6xl">
                                                        🥗
                                                    </div>
                                                )}
                                                <span className="absolute top-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#397A4B] backdrop-blur">
                                                    {product.sold_count > 0
                                                        ? 'Favorit siswa'
                                                        : product.category.name}
                                                </span>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex min-h-[58px] justify-between gap-2">
                                                    <div>
                                                        <h3 className="leading-5 font-bold">
                                                            {product.name}
                                                        </h3>
                                                        <p className="mt-1 line-clamp-1 text-xs text-[#85877D]">
                                                            {product.description ||
                                                                product.category
                                                                    .name}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 self-start rounded-md bg-[#EEF1E7] px-2 py-1 text-[10px] font-semibold text-[#397A4B]">
                                                        Kantin
                                                    </span>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between border-t border-[#F0EEE8] pt-3 dark:border-white/10">
                                                    <div>
                                                        <p className="text-[15px] font-black text-[#E34B1B]">
                                                            {rupiah(
                                                                product.price,
                                                            )}
                                                        </p>
                                                        <p
                                                            className={`mt-0.5 text-[10px] font-medium ${product.stock > 0 ? 'text-[#85877D]' : 'text-[#D83D32]'}`}
                                                        >
                                                            {product.stock > 0
                                                                ? `Stok ${product.stock}`
                                                                : 'Habis'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        disabled={
                                                            product.stock ===
                                                                0 || !isOpen
                                                        }
                                                        onClick={() =>
                                                            void addToCart(
                                                                product,
                                                            )
                                                        }
                                                        className="grid size-9 place-items-center rounded-xl bg-[#242A21] text-white transition hover:bg-[#E34B1B] disabled:cursor-not-allowed disabled:bg-[#d2d2cc] dark:bg-[#E34B1B]"
                                                    >
                                                        <ShoppingBag className="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                    <section
                        id="cara-pesan"
                        className="mt-14 rounded-[24px] bg-[#F6EEDC] px-6 py-9 sm:px-9 dark:bg-white/5"
                    >
                        <div className="text-center">
                            <p className="text-[10px] font-extrabold tracking-[.18em] text-[#E34B1B]">
                                PRAKTIS BANGET
                            </p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight">
                                Jajan jadi gampang.
                            </h2>
                            <p className="mt-2 text-sm text-[#85877D]">
                                Tiga langkah sederhana, lalu makanan favoritmu
                                siap.
                            </p>
                        </div>
                        <div className="mt-7 grid gap-5 md:grid-cols-3">
                            {[
                                [
                                    '01',
                                    'Pilih menu favorit',
                                    'Jelajahi pilihan makanan dan minuman kantin.',
                                ],
                                [
                                    '02',
                                    'Atur pengambilan',
                                    'Pilih lokasi kelas atau ambil langsung di kantin.',
                                ],
                                [
                                    '03',
                                    'Bayar dan nikmati',
                                    'Pantau status pesanan sampai siap dinikmati.',
                                ],
                            ].map(([number, title, detail]) => (
                                <div
                                    key={number}
                                    className="flex gap-4 rounded-2xl bg-white p-5 dark:bg-white/5"
                                >
                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E34B1B]/10 text-sm font-black text-[#E34B1B]">
                                        {number}
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-bold">
                                            {title}
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-[#85877D]">
                                            {detail}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>
                <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#EAE7DF] bg-white/95 px-2 py-2 backdrop-blur md:hidden dark:border-white/10 dark:bg-[#171a16]/95">
                    <a
                        href="#menu"
                        className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#E34B1B]"
                    >
                        <Utensils className="size-[18px]" />
                        Menu
                    </a>
                    <a
                        href="#cara-pesan"
                        className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#85877D]"
                    >
                        <Sparkles className="size-[18px]" />
                        Cara pesan
                    </a>
                    <Link
                        href={ordersRoute.url()}
                        className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#85877D]"
                    >
                        <Clock3 className="size-[18px]" />
                        Pesanan
                    </Link>
                    <Link
                        href={cartRoute.url()}
                        className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#85877D]"
                    >
                        <ShoppingBag className="size-[18px]" />
                        Keranjang
                    </Link>
                    <Link
                        href={profileRoute.url()}
                        className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-[#85877D]"
                    >
                        <span className="grid size-[18px] place-items-center rounded-full bg-[#EEF1E7] text-[10px] font-black text-[#397A4B] uppercase">
                            {auth.user.name.slice(0, 1)}
                        </span>
                        Profil
                    </Link>
                </nav>
            </div>
        </>
    );
}
