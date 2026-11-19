<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    public function __invoke(): Response
    {
        $today = now()->startOfDay();
        $dailySales = Order::query()
            ->where('status', OrderStatus::Completed)
            ->where('created_at', '>=', $today->subDays(6))
            ->selectRaw('DATE(created_at) as date, SUM(total) as total')
            ->groupByRaw('DATE(created_at)')
            ->pluck('total', 'date');

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'salesToday' => Order::query()->where('status', OrderStatus::Completed)->where('created_at', '>=', $today)->sum('total'),
                'ordersToday' => Order::query()->where('created_at', '>=', $today)->count(),
                'products' => Product::query()->count(),
                'students' => User::query()->where('role', 'student')->count(),
                'staff' => User::query()->where('role', 'staff')->count(),
                'processing' => Order::query()->whereIn('status', [OrderStatus::Accepted, OrderStatus::Preparing, OrderStatus::ReadyForDelivery, OrderStatus::Delivering])->count(),
            ],
            'popularProducts' => Product::query()->orderByDesc('sold_count')->limit(5)->get(['id', 'name', 'sold_count', 'stock']),
            'salesByDay' => collect(range(6, 0))->map(fn (int $daysAgo): array => [
                'label' => now()->subDays($daysAgo)->locale('id')->isoFormat('dd'),
                'total' => (float) $dailySales->get(now()->subDays($daysAgo)->toDateString(), 0),
            ]),
        ]);
    }
}
