import { Link } from '@inertiajs/react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { logout } from '@/routes';

export default function StaffAccountActions() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                aria-label={
                    isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'
                }
                title={isDark ? 'Mode terang' : 'Mode gelap'}
                className="grid size-10 place-items-center rounded-xl border border-[#EAE7DF] bg-white text-[#252920] transition hover:border-[#E34B1B]/40 hover:text-[#E34B1B] dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
                {isDark ? (
                    <Sun className="size-4" />
                ) : (
                    <Moon className="size-4" />
                )}
            </button>
            <Link
                href={logout()}
                method="post"
                as="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EAE7DF] bg-white px-3 text-xs font-bold text-[#D83D32] transition hover:bg-[#FCECE6] dark:border-white/10 dark:bg-white/5 dark:hover:bg-[#D83D32]/10"
            >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Keluar</span>
            </Link>
        </div>
    );
}
