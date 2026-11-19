<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StaffOrderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('staff/orders', [
            'orders' => Order::query()->with(['customer:id,name,nis,class_name', 'items', 'payment'])->latest()->get(),
        ]);
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
