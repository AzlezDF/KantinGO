<?php

use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Order;
use App\Models\User;

test('students cannot access staff orders', function (): void {
    $this->actingAs(User::factory()->create())->get(route('staff.orders.index'))->assertForbidden();
});

test('staff can only apply a valid next status', function (): void {
    $student = User::factory()->create();
    $staff = User::factory()->create(['role' => UserRole::Staff]);
    $order = Order::create([
        'order_number' => 'KGO-TEST-1',
        'user_id' => $student->id,
        'status' => OrderStatus::AwaitingConfirmation,
        'fulfillment_method' => 'pickup',
        'subtotal' => 10000,
        'total' => 10000,
    ]);

    $this->actingAs($staff)->patch(route('staff.orders.update-status', $order), ['status' => 'preparing'])
        ->assertSessionHasErrors('status');

    expect($order->refresh()->status)->toBe(OrderStatus::AwaitingConfirmation);
});
