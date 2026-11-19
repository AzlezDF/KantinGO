<?php

namespace App\Actions;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutOrder
{
    /**
     * @param  array{fulfillment_method: string, location_block?: string|null, location_room?: string|null, location_note?: string|null, order_note?: string|null, payment_method: string}  $data
     */
    public function handle(User $customer, array $data): Order
    {
        return DB::transaction(function () use ($customer, $data): Order {
            $cart = Cart::query()
                ->whereBelongsTo($customer)
                ->with('items')
                ->lockForUpdate()
                ->first();

            if ($cart === null || $cart->items->isEmpty()) {
                throw ValidationException::withMessages(['cart' => 'Keranjang belanja masih kosong.']);
            }

            $products = Product::query()
                ->whereKey($cart->items->pluck('product_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $subtotal = 0;

            foreach ($cart->items as $cartItem) {
                $product = $products->get($cartItem->product_id);

                if ($product === null || ! $product->is_available || $product->stock < $cartItem->quantity) {
                    throw ValidationException::withMessages(['cart' => 'Stok salah satu produk sudah berubah. Periksa keranjang Anda kembali.']);
                }

                $subtotal += $product->price * $cartItem->quantity;
            }

            $order = Order::create([
                'order_number' => 'KGO-'.Str::upper(Str::random(10)),
                'user_id' => $customer->id,
                'status' => OrderStatus::AwaitingConfirmation,
                'fulfillment_method' => $data['fulfillment_method'],
                'location_block' => $data['location_block'] ?? null,
                'location_room' => $data['location_room'] ?? null,
                'location_note' => $data['location_note'] ?? null,
                'order_note' => $data['order_note'] ?? null,
                'subtotal' => $subtotal,
                'total' => $subtotal,
            ]);

            foreach ($cart->items as $cartItem) {
                $product = $products->get($cartItem->product_id);

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'unit_price' => $product->price,
                    'quantity' => $cartItem->quantity,
                    'line_total' => $product->price * $cartItem->quantity,
                ]);

                $product->decrement('stock', $cartItem->quantity);
                $product->increment('sold_count', $cartItem->quantity);
            }

            $paymentMethod = PaymentMethod::from($data['payment_method']);
            $order->payment()->create([
                'method' => $paymentMethod,
                'status' => $paymentMethod === PaymentMethod::Qris ? PaymentStatus::AwaitingVerification : PaymentStatus::Unpaid,
                'amount' => $subtotal,
            ]);

            $order->statusHistory()->create([
                'changed_by' => $customer->id,
                'status' => OrderStatus::AwaitingConfirmation,
                'note' => 'Pesanan dibuat oleh siswa.',
            ]);

            $cart->items()->delete();

            return $order->load(['items', 'payment']);
        }, attempts: 3);
    }
}
