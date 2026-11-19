<?php

namespace App\Http\Controllers;

use App\Actions\CheckoutOrder;
use App\Http\Requests\CheckoutOrderRequest;
use App\Models\StoreSetting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('checkout/create');
    }

    public function store(CheckoutOrderRequest $request, CheckoutOrder $checkoutOrder): RedirectResponse
    {
        if (StoreSetting::query()->where('key', 'is_open')->value('value') === 'false') {
            return back()->withErrors(['cart' => 'Kantin sedang tutup. Pesanan belum dapat dibuat.']);
        }

        if ($request->validated('payment_method') === 'qris' && StoreSetting::query()->where('key', 'qris_image_path')->doesntExist()) {
            return back()->withErrors(['payment_method' => 'QRIS belum dikonfigurasi oleh administrator.']);
        }

        $order = $checkoutOrder->handle($request->user(), $request->validated());

        if ($request->hasFile('payment_proof')) {
            $order->payment()->update([
                'proof_path' => $request->file('payment_proof')->store('payment-proofs', 'private'),
            ]);
        }

        return to_route('orders.index')->with('success', "Pesanan {$order->order_number} berhasil dibuat.");
    }
}
