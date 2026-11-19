import { Utensils } from 'lucide-react';
import type { AuthLayoutProps } from '@/types';

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <main className="min-h-svh bg-[#FAF9F5] p-4 text-[#252920] dark:bg-[#171a16] dark:text-[#f6f5ef] sm:p-7">
            <div className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-[1100px] overflow-hidden rounded-[28px] border border-[#EAE7DF] bg-white shadow-[0_24px_80px_rgba(36,42,33,.08)] dark:border-white/10 dark:bg-[#20241e] lg:grid-cols-[1fr_.9fr]">
                <section className="relative hidden flex-col justify-between overflow-hidden bg-[#242A21] p-10 text-white lg:flex xl:p-14">
                    <div className="absolute -right-28 top-16 size-[360px] rounded-full bg-[#E34B1B]/20 blur-3xl" />
                    <div className="relative z-10 flex w-fit items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#E34B1B]"><Utensils className="size-5" /></span><span className="text-xl font-black">Kantin<span className="text-[#F28B63]">GO</span></span></div>
                    <div className="relative z-10 py-14"><p className="text-[10px] font-extrabold tracking-[.2em] text-[#F28B63]">ISTIRAHAT MAKIN NIKMAT</p><h1 className="mt-4 text-4xl font-black leading-[1.1] tracking-[-.04em] xl:text-[46px]">Menu kantin<br />dekat denganmu.</h1><p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Pesan makanan favorit dari kelas, laboratorium, atau bengkel. Praktis, nyaman, dan nggak perlu antre.</p><div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid size-11 place-items-center rounded-xl bg-[#F6EEDC] text-2xl">🍜</span><div><p className="text-sm font-bold">Jajan tanpa buru-buru</p><p className="mt-0.5 text-xs text-white/55">Kantin SMKN 1 Adiwerna</p></div></div></div>
                    <p className="relative z-10 text-xs text-white/40">KantinGO · Smart School Canteen</p>
                </section>
                <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
                    <div className="w-full max-w-[390px]">
                        {children}
                        <p className="mt-8 border-t border-[#EAE7DF] pt-5 text-center text-[11px] leading-5 text-[#85877D] dark:border-white/10">Dengan masuk, kamu menyetujui penggunaan KantinGO untuk pemesanan di lingkungan sekolah.</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
