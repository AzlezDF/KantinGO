import { Form, Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ImagePlus,
    Pencil,
    Plus,
    Trash2,
    Utensils,
} from 'lucide-react';
import { useState } from 'react';
import { kantingo } from '../../lib/kantingo-routes';
import { productImageUrl } from '../../services/supabase-store';
import StaffAccountActions from '../../components/staff-account-actions';

type Category = { id: string; name: string };
type Product = {
    id: string;
    name: string;
    description: string | null;
    category_id: string;
    category: { name: string } | null;
    price: number;
    stock: number;
    image_path: string | null;
    is_available: boolean;
};
type Props = {
    categories: Category[];
    products: Product[];
    configured: boolean;
    loadError: string | null;
};
const rupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
const field =
    'mt-1.5 h-11 w-full rounded-xl border border-[#EAE7DF] bg-white px-3 text-sm outline-none focus:border-[#E34B1B]/60 focus:ring-4 focus:ring-[#E34B1B]/10 dark:border-white/10 dark:bg-[#171a16]';

export default function StaffMenu({
    categories,
    products,
    configured,
    loadError,
}: Props) {
    const [editing, setEditing] = useState<Product | null>(null);
    const formKey = editing?.id ?? 'new';
    const action = editing
        ? kantingo.staff.menuUpdate.url({ product: editing.id })
        : kantingo.staff.menuStore.url();

    return (
        <>
            <Head title="Menu Kantin — KantinGO" />
            <main className="min-h-screen bg-[#FAF9F5] px-4 py-7 text-[#252920] sm:px-7 dark:bg-[#171a16] dark:text-[#f6f5ef]">
                <div className="mx-auto max-w-[1280px]">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="grid size-12 place-items-center rounded-2xl bg-[#E34B1B] text-white">
                                <Utensils className="size-6" />
                            </span>
                            <div>
                                <p className="text-[10px] font-extrabold tracking-[.18em] text-[#E34B1B]">
                                    RUANG OPERASIONAL
                                </p>
                                <h1 className="text-3xl font-black tracking-[-.04em]">
                                    Menu kantin
                                </h1>
                                <p className="text-sm text-[#85877D]">
                                    Kelola produk yang tampil di katalog siswa.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={kantingo.staff.orders.url()}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EAE7DF] bg-white px-3 text-xs font-bold dark:border-white/10 dark:bg-white/5"
                            >
                                <ArrowLeft className="size-4" /> Pesanan
                            </Link>
                            <Link
                                href={kantingo.staff.storeSettings.url()}
                                className="inline-flex h-10 items-center rounded-xl bg-[#242A21] px-4 text-xs font-bold text-white"
                            >
                                Status & jam kantin
                            </Link>
                            <StaffAccountActions />
                        </div>
                    </header>
                    {loadError && (
                        <div className="mt-5 rounded-xl border border-[#E34B1B]/20 bg-[#F6EEDC] p-4 text-sm text-[#8A4A32]">
                            {loadError}{' '}
                            {configured &&
                                'Periksa koneksi dan skema tabel Supabase.'}
                        </div>
                    )}
                    <div className="mt-6 grid items-start gap-5 xl:grid-cols-[350px_1fr]">
                        <Form
                            key={formKey}
                            action={action}
                            method="post"
                            encType="multipart/form-data"
                            onSuccess={() => setEditing(null)}
                            className="rounded-2xl border border-[#EAE7DF] bg-white p-5 shadow-[0_10px_28px_rgba(36,42,33,.04)] dark:border-white/10 dark:bg-white/5"
                        >
                            {({ errors, processing }) => (
                                <>
                                    {editing && (
                                        <input
                                            type="hidden"
                                            name="_method"
                                            value="patch"
                                        />
                                    )}
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-black">
                                            {editing
                                                ? 'Edit menu'
                                                : 'Tambah menu'}
                                        </h2>
                                        {editing && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(null)}
                                                className="text-xs font-bold text-[#85877D]"
                                            >
                                                Batal edit
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-4 space-y-3.5">
                                        <label className="block text-xs font-bold">
                                            Nama menu
                                            <input
                                                name="name"
                                                required
                                                minLength={2}
                                                maxLength={160}
                                                defaultValue={
                                                    editing?.name ?? ''
                                                }
                                                placeholder="Contoh: Nasi ayam"
                                                className={field}
                                            />
                                        </label>
                                        <label className="block text-xs font-bold">
                                            Kategori
                                            <select
                                                key={`category-${formKey}`}
                                                name="category_id"
                                                required
                                                defaultValue={
                                                    editing?.category_id ??
                                                    categories[0]?.id ??
                                                    ''
                                                }
                                                className={field}
                                            >
                                                <option value="" disabled>
                                                    Pilih kategori
                                                </option>
                                                {categories.map((category) => (
                                                    <option
                                                        value={category.id}
                                                        key={category.id}
                                                    >
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="block text-xs font-bold">
                                                Harga (Rp)
                                                <input
                                                    name="price"
                                                    type="number"
                                                    min="0"
                                                    max="10000000"
                                                    required
                                                    defaultValue={
                                                        editing?.price ?? ''
                                                    }
                                                    className={field}
                                                />
                                            </label>
                                            <label className="block text-xs font-bold">
                                                Stok
                                                <input
                                                    name="stock"
                                                    type="number"
                                                    min="0"
                                                    max="100000"
                                                    required
                                                    defaultValue={
                                                        editing?.stock ?? 0
                                                    }
                                                    className={field}
                                                />
                                            </label>
                                        </div>
                                        <label className="block text-xs font-bold">
                                            Deskripsi
                                            <textarea
                                                name="description"
                                                maxLength={1000}
                                                defaultValue={
                                                    editing?.description ?? ''
                                                }
                                                className={`${field} min-h-20 py-3`}
                                            />
                                        </label>
                                        <label className="block text-xs font-bold">
                                            Foto menu
                                            <input
                                                name="image"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#F6EEDC] file:px-3 file:py-2 file:font-bold"
                                            />
                                            <span className="mt-1 block font-normal text-[#85877D]">
                                                JPG, PNG, atau WebP maksimal 5
                                                MB.
                                            </span>
                                        </label>
                                        <input
                                            type="hidden"
                                            name="is_available"
                                            value="0"
                                        />
                                        <label className="flex items-center gap-2 text-xs font-semibold">
                                            <input
                                                type="checkbox"
                                                name="is_available"
                                                value="1"
                                                defaultChecked={
                                                    editing?.is_available ??
                                                    true
                                                }
                                                className="size-4 accent-[#E34B1B]"
                                            />{' '}
                                            Tersedia untuk dipesan
                                        </label>
                                        {Object.values(errors).map(
                                            (message) => (
                                                <p
                                                    key={message}
                                                    className="text-xs font-medium text-[#D83D32]"
                                                >
                                                    {message}
                                                </p>
                                            ),
                                        )}
                                        {!configured && (
                                            <p className="text-xs text-[#D83D32]">
                                                Form baru aktif setelah secret
                                                server Supabase diatur.
                                            </p>
                                        )}
                                        <button
                                            disabled={
                                                processing ||
                                                !configured ||
                                                categories.length === 0
                                            }
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E34B1B] text-sm font-extrabold text-white transition hover:bg-[#C93D14] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Plus className="size-4" />
                                            {processing
                                                ? 'Menyimpan…'
                                                : editing
                                                  ? 'Simpan perubahan'
                                                  : 'Tambah menu'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </Form>
                        <section className="overflow-hidden rounded-2xl border border-[#EAE7DF] bg-white dark:border-white/10 dark:bg-white/5">
                            <div className="flex items-center justify-between border-b border-[#F0EEE8] px-5 py-4 dark:border-white/10">
                                <div>
                                    <h2 className="font-black">Daftar menu</h2>
                                    <p className="mt-0.5 text-xs text-[#85877D]">
                                        {products.length} produk dari katalog
                                        Supabase
                                    </p>
                                </div>
                                <span className="rounded-lg bg-[#EEF1E7] px-2.5 py-1 text-[10px] font-bold text-[#397A4B]">
                                    {
                                        products.filter(
                                            (product) =>
                                                product.is_available &&
                                                product.stock > 0,
                                        ).length
                                    }{' '}
                                    tersedia
                                </span>
                            </div>
                            {products.length ? (
                                <div className="divide-y divide-[#F0EEE8] dark:divide-white/10">
                                    {products.map((product) => (
                                        <article
                                            key={product.id}
                                            className="flex flex-wrap items-center gap-3 p-4 sm:px-5"
                                        >
                                            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-[#F6EEDC] dark:bg-white/5">
                                                {productImageUrl(
                                                    product.image_path,
                                                ) ? (
                                                    <img
                                                        src={
                                                            productImageUrl(
                                                                product.image_path,
                                                            ) ?? ''
                                                        }
                                                        alt={product.name}
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid size-full place-items-center">
                                                        <ImagePlus className="size-5 text-[#b6ad9b]" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate text-sm font-extrabold">
                                                        {product.name}
                                                    </h3>
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[9px] font-bold ${product.is_available && product.stock > 0 ? 'bg-[#EEF1E7] text-[#397A4B]' : 'bg-[#FCECE6] text-[#D83D32]'}`}
                                                    >
                                                        {product.is_available &&
                                                        product.stock > 0
                                                            ? 'Tersedia'
                                                            : 'Habis / nonaktif'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-[#85877D]">
                                                    {product.category?.name ??
                                                        'Tanpa kategori'}{' '}
                                                    · {rupiah(product.price)} ·
                                                    Stok {product.stock}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() =>
                                                        setEditing(product)
                                                    }
                                                    aria-label={`Edit ${product.name}`}
                                                    className="grid size-9 place-items-center rounded-lg text-[#686b62] hover:bg-[#F6EEDC] hover:text-[#E34B1B]"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        window.confirm(
                                                            `Hapus menu ${product.name}?`,
                                                        ) &&
                                                        router.delete(
                                                            kantingo.staff.menuDelete.url(
                                                                {
                                                                    product:
                                                                        product.id,
                                                                },
                                                            ),
                                                        )
                                                    }
                                                    aria-label={`Hapus ${product.name}`}
                                                    className="grid size-9 place-items-center rounded-lg text-[#85877D] hover:bg-[#FCECE6] hover:text-[#D83D32]"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-5 py-16 text-center">
                                    <Utensils className="mx-auto size-7 text-[#b8b5aa]" />
                                    <p className="mt-3 font-bold">
                                        Belum ada menu
                                    </p>
                                    <p className="mt-1 text-sm text-[#85877D]">
                                        Tambahkan produk baru melalui formulir
                                        di samping.
                                    </p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
}
