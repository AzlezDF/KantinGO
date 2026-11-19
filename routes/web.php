<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\Staff\MenuController as StaffMenuController;
use App\Http\Controllers\Staff\StoreSettingsController;
use App\Http\Controllers\StaffOrderController;
use App\Http\Controllers\StaffPaymentController;
use App\Http\Controllers\StorefrontController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

Route::get('/', [StorefrontController::class, 'index'])->name('home');

Route::middleware('auth')->group(function (): void {
    Route::get('dashboard', function (Request $request): RedirectResponse|Response {
        return match (true) {
            $request->user()->isAdmin() => to_route('admin.dashboard'),
            $request->user()->isStaff() => to_route('staff.orders.index'),
            default => Inertia::render('storefront/index'),
        };
    })->name('dashboard');

    Route::get('cart', [CartController::class, 'show'])->name('cart.show');
    Route::post('cart', [CartController::class, 'store'])->name('cart.store');
    Route::patch('cart-items/{cartItem}', [CartController::class, 'update'])->name('cart-items.update');
    Route::delete('cart-items/{cartItem}', [CartController::class, 'destroy'])->name('cart-items.destroy');
    Route::get('checkout', [CheckoutController::class, 'create'])->name('checkout.create');
    Route::post('checkout', [CheckoutController::class, 'store'])->name('checkout.store');
    Route::get('orders', [StorefrontController::class, 'orders'])->name('orders.index');

    Route::middleware('can:manage-orders')->prefix('staff')->name('staff.')->group(function (): void {
        Route::get('orders', [StaffOrderController::class, 'index'])->name('orders.index');
        Route::patch('orders/{order}/status', [StaffOrderController::class, 'update'])->name('orders.update-status');
        Route::patch('orders/{order}/payment', [StaffPaymentController::class, 'update'])->name('orders.update-payment');
        Route::get('menu', [StaffMenuController::class, 'index'])->name('menu.index');
        Route::post('menu', [StaffMenuController::class, 'store'])->name('menu.store');
        Route::patch('menu/{product}', [StaffMenuController::class, 'update'])->name('menu.update');
        Route::delete('menu/{product}', [StaffMenuController::class, 'destroy'])->name('menu.destroy');
        Route::get('store-settings', [StoreSettingsController::class, 'edit'])->name('store-settings.edit');
        Route::patch('store-settings', [StoreSettingsController::class, 'update'])->name('store-settings.update');
    });

    Route::middleware('can:manage-store')->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('dashboard', AdminDashboardController::class)->name('dashboard');
        Route::resource('products', ProductController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
