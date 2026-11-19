<?php

namespace App\Enums;

enum OrderStatus: string
{
    case AwaitingConfirmation = 'awaiting_confirmation';
    case Accepted = 'accepted';
    case Preparing = 'preparing';
    case ReadyForDelivery = 'ready_for_delivery';
    case Delivering = 'delivering';
    case ReadyForPickup = 'ready_for_pickup';
    case Completed = 'completed';
    case Rejected = 'rejected';
}
