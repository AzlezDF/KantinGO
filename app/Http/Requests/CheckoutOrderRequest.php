<?php

namespace App\Http\Requests;

use App\Enums\FulfillmentMethod;
use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    public function rules(): array
    {
        return [
            'fulfillment_method' => ['required', Rule::enum(FulfillmentMethod::class)],
            'location_block' => ['nullable', 'required_if:fulfillment_method,delivery', 'string', 'max:80'],
            'location_room' => ['nullable', 'required_if:fulfillment_method,delivery', 'string', 'max:120'],
            'location_note' => ['nullable', 'string', 'max:500'],
            'order_note' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['required', Rule::enum(PaymentMethod::class)],
            'payment_proof' => ['nullable', 'required_if:payment_method,qris', 'image', 'max:2048'],
        ];
    }
}
