<?php

namespace App\Http\Controllers\Staff;

use App\Actions\SupabaseManagement;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StoreSettingsController extends Controller
{
    public function edit(SupabaseManagement $supabase): Response
    {
        $settings = ['is_open' => true, 'opening_time' => '07:00', 'closing_time' => '15:30'];
        $loadError = null;

        if ($supabase->configured()) {
            try {
                $settings = $supabase->storeSettings();
            } catch (Throwable $exception) {
                Log::error('Store settings could not load from Supabase.', ['exception' => $exception]);
                $loadError = 'Pengaturan kantin gagal dimuat dari Supabase.';
            }
        } else {
            $loadError = 'Tambahkan SUPABASE_SECRET_KEY di .env agar pengaturan dapat disimpan.';
        }

        return Inertia::render('staff/store-settings', [
            'settings' => $settings,
            'configured' => $supabase->configured(),
            'loadError' => $loadError,
        ]);
    }

    public function update(Request $request, SupabaseManagement $supabase): RedirectResponse
    {
        $validated = $request->validate([
            'is_open' => ['required', 'boolean'],
            'opening_time' => ['required', 'date_format:H:i'],
            'closing_time' => ['required', 'date_format:H:i', 'after:opening_time'],
        ], [
            'closing_time.after' => 'Jam tutup harus setelah jam buka.',
        ]);

        try {
            $supabase->updateStoreSettings([
                'is_open' => (bool) $validated['is_open'],
                'opening_time' => $validated['opening_time'],
                'closing_time' => $validated['closing_time'],
            ]);
        } catch (Throwable $exception) {
            Log::error('Store settings could not be saved to Supabase.', ['exception' => $exception]);
            throw ValidationException::withMessages(['settings' => 'Pengaturan gagal disimpan ke Supabase. Periksa SUPABASE_SECRET_KEY dan koneksi.']);
        }

        return back()->with('success', 'Status dan jam operasional kantin berhasil diperbarui.');
    }
}
