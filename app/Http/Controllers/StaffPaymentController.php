<?php

namespace App\Http\Controllers;

use App\Actions\SupabaseManagement;
use App\Enums\PaymentStatus;
use App\Http\Requests\VerifyPaymentRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

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

    public function confirmSupabaseCash(string $orderId, SupabaseManagement $supabase): RedirectResponse
    {
        try {
            $confirmed = $supabase->confirmCashPayment($orderId);
        } catch (Throwable $exception) {
            Log::error('Staff could not confirm a Supabase cash payment.', [
                'order_id' => $orderId,
                'exception' => $exception,
            ]);

            throw ValidationException::withMessages([
                'payment' => 'Pembayaran tunai gagal diperbarui. Periksa koneksi Supabase.',
            ]);
        }

        if (! $confirmed) {
            throw ValidationException::withMessages([
                'payment' => 'Pembayaran tidak ditemukan, bukan tunai, atau sudah dikonfirmasi sebelumnya.',
            ]);
        }

        return back()->with('success', 'Pembayaran tunai pesanan berhasil dikonfirmasi.');
    }
}
