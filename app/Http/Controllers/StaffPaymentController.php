<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Http\Requests\VerifyPaymentRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;

class StaffPaymentController extends Controller
{
    public function update(VerifyPaymentRequest $request, Order $order): RedirectResponse
    {
        $this->authorize('update', $order);

        $order->payment()->update([
            'status' => PaymentStatus::from($request->validated('status')),
            'rejection_reason' => $request->validated('rejection_reason'),
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        return back()->with('success', 'Status pembayaran diperbarui.');
    }
}
