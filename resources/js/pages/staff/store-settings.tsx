import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Clock3, DoorClosed, DoorOpen, Save } from 'lucide-react';
import { kantingo } from '../../lib/kantingo-routes';
import StaffAccountActions from '../../components/staff-account-actions';

type Settings = { is_open: boolean; opening_time: string; closing_time: string };
type Props = { settings: Settings; configured: boolean; loadError: string | null };
const timeField = 'mt-1.5 h-12 w-full rounded-xl border border-[#EAE7DF] bg-white px-3 text-base font-bold outline-none focus:border-[#E34B1B]/60 focus:ring-4 focus:ring-[#E34B1B]/10 dark:border-white/10 dark:bg-[#171a16]';

export default function StaffStoreSettings({ settings, configured, loadError }: Props) {
    return <>
        <Head title="Operasional Kantin — KantinGO" />
        <main className="min-h-screen bg-[#FAF9F5] px-4 py-7 text-[#252920] dark:bg-[#171a16] dark:text-[#f6f5ef] sm:px-7">
            <div className="mx-auto max-w-3xl">
                <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#E34B1B] text-white"><Clock3 className="size-6" /></span><div><p className="text-[10px] font-extrabold tracking-[.18em] text-[#E34B1B]">RUANG OPERASIONAL</p><h1 className="text-3xl font-black tracking-[-.04em]">Operasional kantin</h1><p className="text-sm text-[#85877D]">Atur status pemesanan dan jam layanan.</p></div></div><div className="flex items-center gap-2"><Link href={kantingo.staff.orders.url()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EAE7DF] bg-white px-3 text-xs font-bold dark:border-white/10 dark:bg-white/5"><ArrowLeft className="size-4" /> Pesanan</Link><StaffAccountActions /></div></header>
                {loadError && <div className="mt-5 rounded-xl border border-[#E34B1B]/20 bg-[#F6EEDC] p-4 text-sm text-[#8A4A32]">{loadError}</div>}
                <Form action={kantingo.staff.storeSettingsUpdate.url()} method="patch" className="mt-6 overflow-hidden rounded-2xl border border-[#EAE7DF] bg-white shadow-[0_10px_28px_rgba(36,42,33,.04)] dark:border-white/10 dark:bg-white/5">
                    {({ errors, processing }) => <>
                        <div className="border-b border-[#F0EEE8] p-5 dark:border-white/10 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#F6EEDC] text-[#E34B1B]"><Clock3 className="size-5" /></span><div><h2 className="font-black">Jam operasional</h2><p className="text-xs text-[#85877D]">Informasi ini ditampilkan kepada siswa.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Jam buka<input type="time" name="opening_time" required defaultValue={settings.opening_time} className={timeField} /></label><label className="text-xs font-bold">Jam tutup<input type="time" name="closing_time" required defaultValue={settings.closing_time} className={timeField} /></label></div></div>
                        <div className="p-5 sm:p-7"><h2 className="font-black">Status penerimaan pesanan</h2><p className="mt-1 text-xs leading-5 text-[#85877D]">Jika ditutup, siswa tetap bisa melihat katalog tetapi tombol pesan dinonaktifkan dan checkout akan ditolak oleh database.</p><input type="hidden" name="is_open" value="0" /><label className="mt-4 flex cursor-pointer items-center gap-4 rounded-2xl border border-[#EAE7DF] p-4 transition hover:border-[#E34B1B]/30 dark:border-white/10"><input type="checkbox" name="is_open" value="1" defaultChecked={settings.is_open} className="peer sr-only" /><span className={`grid size-12 shrink-0 place-items-center rounded-xl ${settings.is_open ? 'bg-[#EEF1E7] text-[#397A4B]' : 'bg-[#FCECE6] text-[#D83D32]'}`}>{settings.is_open ? <DoorOpen className="size-6" /> : <DoorClosed className="size-6" />}</span><span className="flex-1"><b className="block text-sm">Kantin sedang buka</b><span className="mt-1 block text-xs text-[#85877D]">Aktif: siswa dapat menambahkan menu ke keranjang dan checkout.</span></span><span className="relative h-6 w-11 rounded-full bg-[#d8d8d0] transition peer-checked:bg-[#397A4B] after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" /></label>
                            {Object.values(errors).map((message) => <p key={message} className="mt-3 text-xs font-medium text-[#D83D32]">{message}</p>)}
                            {!configured && <p className="mt-3 text-xs text-[#D83D32]">Perubahan belum dapat disimpan sebelum SUPABASE_SECRET_KEY disetel.</p>}
                            <button disabled={processing || !configured} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E34B1B] text-sm font-extrabold text-white transition hover:bg-[#C93D14] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"><Save className="size-4" />{processing ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
                        </div>
                    </>}
                </Form>
            </div>
        </main>
    </>;
}
