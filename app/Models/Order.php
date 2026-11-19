<?php

namespace App\Models;

use App\Enums\FulfillmentMethod;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['order_number', 'user_id', 'staff_id', 'status', 'fulfillment_method', 'location_block', 'location_room', 'location_note', 'order_note', 'subtotal', 'total'])]
class Order extends Model
{
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function canTransitionTo(OrderStatus $status): bool
    {
        return match ($this->status) {
            OrderStatus::AwaitingConfirmation => in_array($status, [OrderStatus::Accepted, OrderStatus::Rejected], true),
            OrderStatus::Accepted => in_array($status, [OrderStatus::Preparing, OrderStatus::Rejected], true),
            OrderStatus::Preparing => in_array($status, [OrderStatus::ReadyForDelivery, OrderStatus::ReadyForPickup], true),
            OrderStatus::ReadyForDelivery => $status === OrderStatus::Delivering,
            OrderStatus::Delivering, OrderStatus::ReadyForPickup => $status === OrderStatus::Completed,
            default => false,
        };
    }

    protected function casts(): array
    {
        return ['status' => OrderStatus::class, 'fulfillment_method' => FulfillmentMethod::class];
    }
}
