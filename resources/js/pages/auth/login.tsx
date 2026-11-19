import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LockKeyhole, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store as login } from '@/routes/login';
import { register as registerPage } from '@/routes';
import { signInWithNis } from '@/services/supabase-auth';

export default function Login() {
    const form = useForm({ nis: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    async function submit(
        event: React.FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        form.post(login.url(), {
            onSuccess: () => {
                void signInWithNis(form.data.nis, form.data.password).catch(
                    () => undefined,
                );
            },
        });
    }

    return (
        <>
            <Head title="Masuk KantinGO" />
            <div className="mb-7 flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#E34B1B] text-white">
                    <Utensils className="size-6" />
                </span>
                <div>
                    <p className="text-xl font-black tracking-tight text-[#242A21]">
                        Kantin<span className="text-[#E34B1B]">GO</span>
                    </p>
                    <p className="text-xs text-[#85877D]">
                        Smart School Canteen
                    </p>
                </div>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#252920]">
                Selamat datang di KantinGO
            </h1>
            <p className="mt-2 mb-7 text-sm leading-6 text-[#85877D]">
                Masuk untuk menemukan menu favorit dan pesan langsung dari
                kelas.
            </p>
            <form
                onSubmit={(event) => void submit(event)}
                className="flex flex-col gap-5"
            >
                <div className="grid gap-2">
                    <Label htmlFor="nis">NIS</Label>
                    <Input
                        id="nis"
                        value={form.data.nis}
                        onChange={(event) =>
                            form.setData('nis', event.target.value)
                        }
                        required
                        autoFocus
                        autoComplete="username"
                        placeholder="Masukkan NIS"
                        className="h-12 rounded-xl"
                    />
                    {form.errors.nis && (
                        <p className="text-sm text-red-600">
                            {form.errors.nis}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Kata sandi</Label>
                    <div className="relative">
                        <LockKeyhole className="absolute top-3.5 left-3 size-4 text-[#85877D]" />
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.data.password}
                            onChange={(event) =>
                                form.setData('password', event.target.value)
                            }
                            required
                            autoComplete="current-password"
                            placeholder="Masukkan kata sandi"
                            className="h-12 rounded-xl pr-11 pl-10"
                        />
                        <button
                            type="button"
                            aria-label={
                                showPassword
                                    ? 'Sembunyikan kata sandi'
                                    : 'Tampilkan kata sandi'
                            }
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-3.5 right-3 text-[#85877D]"
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" />
                            ) : (
                                <Eye className="size-4" />
                            )}
                        </button>
                    </div>
                    {form.errors.password && (
                        <p className="text-sm text-red-600">
                            {form.errors.password}
                        </p>
                    )}
                </div>
                <Button
                    type="submit"
                    className="mt-1 h-12 w-full rounded-xl bg-[#E34B1B] font-bold text-white hover:bg-[#C93D14]"
                    disabled={form.processing}
                >
                    {form.processing && <Spinner />}Masuk
                </Button>
            </form>
            <p className="mt-6 text-center text-sm text-[#85877D]">
                Belum punya akun?{' '}
                <Link
                    href={registerPage.url()}
                    className="font-bold text-[#E34B1B] hover:underline"
                >
                    Daftar sekarang
                </Link>
            </p>
        </>
    );
}

Login.layout = {
    title: 'Masuk ke KantinGO',
    description: 'Gunakan NIS dan kata sandi Anda',
};
