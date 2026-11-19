<?php

use App\Models\Cart;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;

test('a student can checkout and stock is decremented on the server', function (): void {
    $student = User::factory()->create();
    $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);
    $product = Product::create(['category_id' => $category->id, 'name' => 'Es Teh', 'slug' => 'es-teh', 'price' => 3000, 'stock' => 3, 'is_available' => true]);
    $cart = Cart::create(['user_id' => $student->id]);
    $cart->items()->create(['product_id' => $product->id, 'quantity' => 2]);

    $this->actingAs($student)->post(route('checkout.store'), [
        'fulfillment_method' => 'delivery',
        'location_block' => 'Teori',
        'location_room' => 'XI TKJ 2',
        'payment_method' => 'cash',
    ])->assertRedirect(route('orders.index'));

    $this->assertDatabaseHas('orders', ['user_id' => $student->id, 'subtotal' => 6000, 'total' => 6000]);
    $this->assertDatabaseHas('products', ['id' => $product->id, 'stock' => 1]);
    $this->assertDatabaseCount('cart_items', 0);
});

test('a student cannot checkout more than current stock', function (): void {
    $student = User::factory()->create();
    $category = Category::create(['name' => 'Jajanan', 'slug' => 'jajanan']);
    $product = Product::create(['category_id' => $category->id, 'name' => 'Sosis', 'slug' => 'sosis', 'price' => 5000, 'stock' => 1, 'is_available' => true]);
    $cart = Cart::create(['user_id' => $student->id]);
    $cart->items()->create(['product_id' => $product->id, 'quantity' => 2]);

    $this->actingAs($student)->from(route('checkout.create'))->post(route('checkout.store'), [
        'fulfillment_method' => 'pickup',
        'payment_method' => 'cash',
    ])->assertSessionHasErrors('cart');

    $this->assertDatabaseCount('orders', 0);
});
