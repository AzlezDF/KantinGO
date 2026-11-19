<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('cart/show');
    }

    public function store(StoreCartItemRequest $request): RedirectResponse
    {
        $product = Product::query()->findOrFail($request->integer('product_id'));
        $cart = Cart::firstOrCreate(['user_id' => $request->user()->id]);
        $item = $cart->items()->firstOrNew(['product_id' => $product->id]);
        $quantity = ($item->exists ? $item->quantity : 0) + $request->integer('quantity');

        if (! $product->is_available || $quantity > $product->stock) {
            throw ValidationException::withMessages(['quantity' => 'Jumlah pesanan melebihi stok yang tersedia.']);
        }

        $item->quantity = $quantity;
        $item->save();

        return back()->with('success', 'Produk ditambahkan ke keranjang.');
    }

    public function update(UpdateCartItemRequest $request, CartItem $cartItem): RedirectResponse
    {
        abort_unless($cartItem->cart->user_id === $request->user()->id, 403);

        if ($request->integer('quantity') > $cartItem->product->stock) {
            throw ValidationException::withMessages(['quantity' => 'Jumlah pesanan melebihi stok yang tersedia.']);
        }

        $cartItem->update($request->validated());

        return back();
    }

    public function destroy(Request $request, CartItem $cartItem): RedirectResponse
    {
        abort_unless($cartItem->cart->user_id === $request->user()->id, 403);
        $cartItem->delete();

        return back()->with('success', 'Produk dihapus dari keranjang.');
    }
}
