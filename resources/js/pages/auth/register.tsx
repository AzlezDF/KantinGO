import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store as registerPage } from '@/routes/register';
import { login as loginPage } from '@/routes';
import { registerStudent } from '@/services/supabase-auth';

export default function Register() {
    const form = useForm({ name: '', nis: '', class_name: '', password: '', password_confirmation: '' });
    const [isCreatingSupabaseAccount, setIsCreatingSupabaseAccount] = useState(false);
    const [registrationError, setRegistrationError] = useState<string | null>(null);

    async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (form.data.password !== form.data.password_confirmation) {
            toast.error('Konfirmasi kata sandi tidak sama.');
            return;
        }
        if (form.data.password.length < 8) {
            toast.error('Kata sandi minimal 8 karakter.');
            return;
        }
        setRegistrationError(null);
        setIsCreatingSupabaseAccount(true);
        try {
            await registerStudent({ name: form.data.name, nis: form.data.nis, className: form.data.class_name, password: form.data.password });
            form.post(registerPage.url());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Pendaftaran gagal.';
            setRegistrationError(message);
            toast.error(message);
        } finally {
            setIsCreatingSupabaseAccount(false);
        }
    }

    return <><Head title="Daftar KantinGO" /><div className="mb-6"><p className="text-2xl font-black text-[#252920]">Buat akun siswa</p><p className="mt-1 text-sm text-[#85877D]">Daftar untuk mulai memesan menu kantin.</p></div>{registrationError && <div role="alert" className="mb-4 flex gap-3 rounded-xl border border-[#D83D32]/20 bg-[#FCECE6] p-3 text-xs leading-5 text-[#8f3027]"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{registrationError} Buka <b>Supabase Dashboard → Authentication → Sign In / Providers → Email</b>, nonaktifkan <b>Confirm email</b>, lalu muat ulang halaman ini untuk mencoba lagi.</p></div>}<form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4"><div className="grid gap-2"><Label htmlFor="name">Nama lengkap</Label><Input id="name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required autoFocus className="h-11 rounded-xl" />{form.errors.name && <p className="text-sm text-red-600">{form.errors.name}</p>}</div><div className="grid gap-2"><Label htmlFor="nis">NIS</Label><Input id="nis" value={form.data.nis} onChange={(event) => form.setData('nis', event.target.value)} required className="h-11 rounded-xl" />{form.errors.nis && <p className="text-sm text-red-600">{form.errors.nis}</p>}</div><div className="grid gap-2"><Label htmlFor="class_name">Kelas</Label><Input id="class_name" value={form.data.class_name} onChange={(event) => form.setData('class_name', event.target.value)} required placeholder="Contoh: XI TKJ 2" className="h-11 rounded-xl" />{form.errors.class_name && <p className="text-sm text-red-600">{form.errors.class_name}</p>}</div><div className="grid gap-2"><Label htmlFor="password">Kata sandi</Label><Input id="password" type="password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} required minLength={8} className="h-11 rounded-xl" /></div><div className="grid gap-2"><Label htmlFor="password_confirmation">Konfirmasi kata sandi</Label><Input id="password_confirmation" type="password" value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} required minLength={8} className="h-11 rounded-xl" /></div><Button type="submit" disabled={form.processing || isCreatingSupabaseAccount} className="mt-1 h-11 rounded-xl bg-[#E34B1B] font-bold text-white hover:bg-[#C93D14]">{(form.processing || isCreatingSupabaseAccount) && <Spinner />}{isCreatingSupabaseAccount ? 'Membuat akun…' : 'Daftar sebagai siswa'}</Button><p className="text-center text-sm text-[#85877D]">Sudah punya akun? <Link href={loginPage.url()} className="font-bold text-[#E34B1B] hover:underline">Masuk</Link></p></form></>;
}

Register.layout = { title: 'Daftar KantinGO', description: 'Buat akun siswa dengan NIS Anda' };
