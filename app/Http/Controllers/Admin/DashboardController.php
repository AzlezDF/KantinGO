<?php

namespace App\Http\Controllers\Admin;

use App\Actions\SupabaseManagement;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    public function __invoke(SupabaseManagement $supabase): Response
    {
        if (! $supabase->configured()) {
            return Inertia::render('admin/dashboard', [
                'loadError' => 'Dashboard belum terhubung ke Supabase. Atur SUPABASE_URL dan SUPABASE_SECRET_KEY di Environment Variables Vercel.',
            ]);
        }

        try {
            return Inertia::render('admin/dashboard', $supabase->adminDashboard());
        } catch (ConnectionException|RequestException $exception) {
            Log::error('Admin dashboard could not load data from Supabase.', ['exception' => $exception]);

            return Inertia::render('admin/dashboard', [
                'loadError' => 'Data dashboard gagal dimuat dari Supabase. Periksa Environment Variables dan Runtime Logs Vercel.',
            ]);
        }
    }
}
