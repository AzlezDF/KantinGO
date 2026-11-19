<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Unpaid = 'unpaid';
    case AwaitingVerification = 'awaiting_verification';
    case Paid = 'paid';
    case Rejected = 'rejected';
}
