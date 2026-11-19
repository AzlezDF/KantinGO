<?php

namespace App\Http\Controllers;

use App\Actions\SupabaseManagement;
use App\Enums\OrderStatus;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StaffOrderController extends Controller
{
    public function index(SupabaseManagement $supabase): Response
    {
        $pendingCashPayments = [];
        $cashPaymentsError = null;
        $supabaseOrders = [];
        $supabaseOrdersError = null;

        if (! $supabase->configured()) {
            $cashPaymentsError = 'Integrasi Supabase belum dikonfigurasi; pesanan online belum dapat dimuat.';
        } else {
            try {
                $pendingCashPayments = $supabase->pendingCashPayments();
                $supabaseOrders = $supabase->activeOrders();
            } catch (Throwable $exception) {
                Log::error('Supabase orders could not be loaded for staff.', ['exception' => $exception]);
                $cashPaymentsError = 'Pesanan online gagal dimuat dari Supabase.';
                $supabaseOrdersError = $cashPaymentsError;
            }
        }

        return Inertia::render('staff/orders', [
            'orders' => Order::query()->with(['customer:id,name,nis,class_name', 'items', 'payment'])->latest()->get(),
            'pendingCashPayments' => $pendingCashPayments,
            'cashPaymentsError' => $cashPaymentsError,
            'supabaseOrders' => $supabaseOrders,
            'supabaseOrdersError' => $supabaseOrdersError,
        ]);
    }

    public function updateSupabase(Request $request, string $orderId, SupabaseManagement $supabase): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $supabase->transitionOrderStatus(
                $orderId,
                $validated['status'],
                $validated['note'] ?? null,
                $request->user()->name,
            );
        } catch (Throwable $exception) {
            Log::warning('Staff could not transition a Supabase order.', [
                'order_id' => $orderId,
                'status' => $validated['status'],
                'exception' => $exception,
            ]);

            throw ValidationException::withMessages([
                'status' => 'Status pesanan tidak dapat diperbarui. Muat ulang daftar pesanan dan coba lagi.',
            ]);
        }

        return back()->with('success', 'Status pesanan diperbarui.');
    }

    public function update(UpdateOrderStatusRequest $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);
        $nextStatus = OrderStatus::from($request->string('status')->toString());

        if (! $order->canTransitionTo($nextStatus)) {
            return back()->withErrors(['status' => 'Perubahan status pesanan ini tidak diizinkan.']);
        }

        if ($nextStatus === OrderStatus::ReadyForDelivery && $order->fulfillment_method->value !== 'delivery') {
            return back()->withErrors(['status' => 'Pesanan ambil sendiri harus ditandai siap diambil.']);
        }

        if ($nextStatus === OrderStatus::ReadyForPickup && $order->fulfillment_method->value !== 'pickup') {
            return back()->withErrors(['status' => 'Pesanan antar harus ditandai siap diantar.']);
        }

        $order->update(['status' => $nextStatus, 'staff_id' => $request->user()->id]);
        $order->statusHistory()->create(['changed_by' => $request->user()->id, 'status' => $nextStatus, 'note' => $request->validated('note')]);

        return back()->with('success', 'Status pesanan diperbarui.');
    }
}
