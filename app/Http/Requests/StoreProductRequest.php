<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['required', 'integer', 'min:0', 'max:1000000'],
            'stock' => ['required', 'integer', 'min:0', 'max:100000'],
            'image' => ['nullable', 'image', 'max:2048'],
            'is_available' => ['boolean'],
        ];
    }
}
