import { supabase } from '@/lib/supabase';

const studentEmailDomain = 'students.kantingo.local';

function studentEmailFromNis(nis: string): string {
    const normalizedNis = nis.trim().toLowerCase();

    if (!/^[a-z0-9._-]{3,40}$/.test(normalizedNis)) {
        throw new Error('NIS hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.');
    }

    return `${normalizedNis}@${studentEmailDomain}`;
}

export async function registerStudent(input: {
    name: string;
    nis: string;
    className: string;
    password: string;
}): Promise<void> {
    const email = studentEmailFromNis(input.nis);
    const { error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
            data: {
                name: input.name.trim(),
                nis: input.nis.trim(),
                class_name: input.className.trim(),
            },
        },
    });

    if (error) {
        if (error.code === 'user_already_exists' || error.message.toLowerCase().includes('already registered')) {
            const existingAccount = await supabase.auth.signInWithPassword({ email, password: input.password });

            if (!existingAccount.error) {
                return;
            }

            throw new Error('NIS ini sudah memiliki akun Supabase. Gunakan kata sandi akun tersebut atau minta administrator memulihkan akun.');
        }

        if (error.code === 'over_email_send_rate_limit' || error.message.toLowerCase().includes('email rate limit exceeded')) {
            throw new Error('Supabase membatasi email konfirmasi sehingga pendaftaran belum selesai. Matikan Confirm email di Supabase Dashboard, tunggu batas pengiriman pulih, lalu coba daftar kembali.');
        }

        throw error;
    }
}

export async function signInWithNis(nis: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
        email: studentEmailFromNis(nis),
        password,
    });

    if (error) {
        throw error;
    }
}

export async function signOutFromSupabase(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }
}
