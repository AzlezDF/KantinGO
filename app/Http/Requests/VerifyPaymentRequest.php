<?php

namespace App\Http\Requests;

use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class VerifyPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff() || $this->user()?->isAdmin() || false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([PaymentStatus::Paid->value, PaymentStatus::Rejected->value])],
            'rejection_reason' => ['nullable', 'required_if:status,rejected', 'string', 'max:500'],
        ];
    }
}
