import { Head, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = { auth: Auth };

export default function Profile() {
    const { auth } = usePage<PageProps>().props;
    const isStudent = auth.user.role === 'student';
    const form = useForm({
        name: auth.user.name,
        email: auth.user.email,
        class_name: auth.user.class_name ?? '',
    });

    async function synchronizeStudentProfile(): Promise<void> {
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();

            if (authError || !authData.user) {
                throw new Error('Sesi Supabase belum aktif. Keluar lalu masuk kembali sebelum mengubah profil.');
            }

            const { data, error } = await supabase
                .from('profiles')
                .update({ name: form.data.name.trim(), class_name: form.data.class_name.trim() || null })
                .eq('id', authData.user.id)
                .select('id')
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (!data) {
                throw new Error('Profil Supabase tidak ditemukan atau tidak dapat diubah.');
            }

            toast.success('Profil siswa berhasil diperbarui.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyelaraskan profil.';
            toast.error(`Data Laravel tersimpan, tetapi profil pemesanan belum tersinkron: ${message}`);
        }
    }

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.patch(ProfileController.update.url(), {
            preserveScroll: true,
            onSuccess: () => {
                if (isStudent) {
                    void synchronizeStudentProfile();
                }
            },
        });
    }

    return (
        <>
            <Head title="Profil akun" />
            <h1 className="sr-only">Pengaturan profil</h1>
            <div className="space-y-8">
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Profil akun"
                        description="Perbarui informasi yang digunakan pada akun KantinGO."
                    />

                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nama lengkap</Label>
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Masukkan nama lengkap"
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        {isStudent && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="nis">NIS</Label>
                                    <Input id="nis" value={auth.user.nis ?? ''} readOnly aria-readonly className="bg-muted" />
                                    <p className="text-xs text-muted-foreground">NIS digunakan untuk masuk dan tidak dapat diubah dari halaman profil.</p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="class_name">Kelas</Label>
                                    <Input
                                        id="class_name"
                                        value={form.data.class_name}
                                        onChange={(event) => form.setData('class_name', event.target.value)}
                                        maxLength={80}
                                        placeholder="Contoh: XI TKJ 2"
                                    />
                                    <InputError message={form.errors.class_name} />
                                </div>
                                <input type="hidden" name="email" value={form.data.email} />
                            </>
                        )}

                        {!isStudent && (
                            <div className="grid gap-2">
                                <Label htmlFor="email">Alamat email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData('email', event.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="Alamat email"
                                />
                                <InputError message={form.errors.email} />
                            </div>
                        )}

                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Menyimpan…' : 'Simpan perubahan'}
                        </Button>
                    </form>
                </div>

                <DeleteUser />
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profil akun',
            href: edit(),
        },
    ],
};
