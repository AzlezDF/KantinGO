<?php

namespace App\Http\Controllers\Staff;

use App\Actions\SupabaseManagement;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\ManageMenuRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MenuController extends Controller
{
    public function index(SupabaseManagement $supabase): Response
    {
        $catalog = ['categories' => [], 'products' => []];
        $error = null;

        if ($supabase->configured()) {
            try {
                $catalog = $supabase->catalog();
            } catch (Throwable $exception) {
                Log::error('Staff menu could not load from Supabase.', ['exception' => $exception]);
                $error = 'Menu Supabase gagal dimuat. Periksa konfigurasi dan koneksi Supabase.';
            }
        } else {
            $error = 'Tambahkan SUPABASE_SECRET_KEY di .env agar petugas dapat mengelola menu.';
        }

        return Inertia::render('staff/menu', [
            ...$catalog,
            'configured' => $supabase->configured(),
            'loadError' => $error,
        ]);
    }

    public function store(ManageMenuRequest $request, SupabaseManagement $supabase): RedirectResponse
    {
        try {
            $supabase->createProduct($request->safe()->except('image'), $request->file('image'));
        } catch (Throwable $exception) {
            Log::error('Staff could not create Supabase product.', ['exception' => $exception]);
            throw ValidationException::withMessages(['menu' => 'Produk gagal disimpan ke Supabase. Periksa konfigurasi Supabase.']);
        }

        return back()->with('success', 'Menu berhasil ditambahkan.');
    }

    public function update(ManageMenuRequest $request, string $product, SupabaseManagement $supabase): RedirectResponse
    {
        abort_unless((bool) preg_match('/^[0-9a-f-]{36}$/i', $product), 404);

        try {
            $supabase->updateProduct($product, $request->safe()->except('image'), $request->file('image'));
        } catch (Throwable $exception) {
            Log::error('Staff could not update Supabase product.', ['exception' => $exception]);
            throw ValidationException::withMessages(['menu' => 'Perubahan menu gagal disimpan. Periksa konfigurasi Supabase.']);
        }

        return back()->with('success', 'Menu berhasil diperbarui.');
    }

    public function destroy(string $product, SupabaseManagement $supabase): RedirectResponse
    {
        abort_unless((bool) preg_match('/^[0-9a-f-]{36}$/i', $product), 404);

        try {
            $supabase->deleteProduct($product);
        } catch (Throwable $exception) {
            Log::error('Staff could not delete Supabase product.', ['exception' => $exception]);
            throw ValidationException::withMessages(['menu' => 'Menu gagal dihapus dari Supabase.']);
        }

        return back()->with('success', 'Menu berhasil dihapus.');
    }
}
