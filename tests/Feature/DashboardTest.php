<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('administrators see dashboard statistics from Supabase', function () {
    $this->travelTo('2026-11-27 10:00:00 UTC');
    config([
        'services.supabase.url' => 'https://kantingo-test.supabase.co',
        'services.supabase.secret_key' => 'test-secret',
    ]);

    Http::preventStrayRequests();
    Http::fake([
        'kantingo-test.supabase.co/rest/v1/orders*' => function (Request $request) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            if (($query['select'] ?? null) === 'total,status,created_at') {
                return Http::response([
                    ['total' => 12000, 'status' => 'completed', 'created_at' => '2026-11-27T08:00:00+00:00'],
                    ['total' => 5000, 'status' => 'awaiting_confirmation', 'created_at' => '2026-11-27T08:30:00+00:00'],
                    ['total' => 7000, 'status' => 'completed', 'created_at' => '2026-11-25T08:00:00+00:00'],
                ]);
            }

            return Http::response([['id' => 'order-1']], 206, ['Content-Range' => '0-0/3']);
        },
        'kantingo-test.supabase.co/rest/v1/products*' => function (Request $request) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            if (($query['select'] ?? null) === 'id,name,sold_count,stock') {
                return Http::response([
                    ['id' => '090a572b-9879-4606-8502-bcbb2108accc', 'name' => 'Nasi Goreng', 'sold_count' => 9, 'stock' => 20],
                ]);
            }

            return Http::response([['id' => 'product-1']], 206, ['Content-Range' => '0-0/6']);
        },
        'kantingo-test.supabase.co/rest/v1/profiles*' => function (Request $request) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            return Http::response(
                [['id' => 'profile-1']],
                206,
                ['Content-Range' => '0-0/'.(($query['role'] ?? null) === 'eq.student' ? '12' : '2')],
            );
        },
    ]);

    $administrator = User::factory()->create(['role' => UserRole::Admin]);

    $this->actingAs($administrator)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.salesToday', 12000)
            ->where('stats.ordersToday', 2)
            ->where('stats.products', 6)
            ->where('stats.students', 12)
            ->where('stats.staff', 2)
            ->where('stats.processing', 3)
            ->where('salesByDay.4.total', 7000)
            ->where('salesByDay.6.total', 12000)
            ->where('popularProducts.0.id', '090a572b-9879-4606-8502-bcbb2108accc'));
});

test('admin dashboard shows a setup message when server-side Supabase credentials are missing', function () {
    config([
        'services.supabase.url' => 'https://kantingo-test.supabase.co',
        'services.supabase.secret_key' => null,
    ]);

    Http::preventStrayRequests();

    $administrator = User::factory()->create(['role' => UserRole::Admin]);

    $this->actingAs($administrator)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('loadError', 'Dashboard belum terhubung ke Supabase. Atur SUPABASE_URL dan SUPABASE_SECRET_KEY di Environment Variables Vercel.'));
});

test('non-administrators cannot view Supabase dashboard data', function () {
    Http::preventStrayRequests();

    $student = User::factory()->create(['role' => UserRole::Student]);

    $this->actingAs($student)
        ->get(route('admin.dashboard'))
        ->assertForbidden();
});

test('administrators see an explicit message when Supabase is unavailable', function () {
    config([
        'services.supabase.url' => 'https://kantingo-test.supabase.co',
        'services.supabase.secret_key' => 'test-secret',
    ]);

    Http::preventStrayRequests();
    Http::fake([
        'kantingo-test.supabase.co/rest/v1/orders*' => Http::failedConnection(),
    ]);

    $administrator = User::factory()->create(['role' => UserRole::Admin]);

    $this->actingAs($administrator)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('loadError', 'Data dashboard gagal dimuat dari Supabase. Periksa Environment Variables dan Runtime Logs Vercel.'));
});
