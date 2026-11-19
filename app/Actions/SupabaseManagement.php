<?php

namespace App\Actions;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SupabaseManagement
{
    public function configured(): bool
    {
        return filled(config('services.supabase.url')) && filled(config('services.supabase.secret_key'));
    }

    /** @return array{categories: array<int, array<string, mixed>>, products: array<int, array<string, mixed>>} */
    public function catalog(): array
    {
        $this->ensureConfigured();

        $categories = $this->request()->get($this->endpoint('categories'), [
            'select' => 'id,name,slug', 'is_active' => 'eq.true', 'order' => 'name.asc',
        ])->throw()->json();
        $products = $this->request()->get($this->endpoint('products'), [
            'select' => 'id,category_id,name,description,price,stock,image_path,is_available,sold_count,category:categories(name)',
            'order' => 'created_at.desc',
        ])->throw()->json();

        return ['categories' => $categories, 'products' => $products];
    }

    /** @param array{name: string, description: ?string, category_id: string, price: int, stock: int, is_available: bool} $data */
    public function createProduct(array $data, ?UploadedFile $image): void
    {
        $this->ensureConfigured();
        $imagePath = $image ? $this->uploadProductImage($image) : null;
        $data['price'] = (int) $data['price'];
        $data['stock'] = (int) $data['stock'];
        $data['is_available'] = filter_var($data['is_available'], FILTER_VALIDATE_BOOLEAN);
        $data['description'] = filled($data['description'] ?? null) ? $data['description'] : null;
        $this->request()->post($this->endpoint('products'), [
            ...$data,
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(8)),
            'image_path' => $imagePath,
        ])->throw();
    }

    /** @param array{name: string, description: ?string, category_id: string, price: int, stock: int, is_available: bool} $data */
    public function updateProduct(string $id, array $data, ?UploadedFile $image): void
    {
        $this->ensureConfigured();
        $data['price'] = (int) $data['price'];
        $data['stock'] = (int) $data['stock'];
        $data['is_available'] = filter_var($data['is_available'], FILTER_VALIDATE_BOOLEAN);
        $data['description'] = filled($data['description'] ?? null) ? $data['description'] : null;
        if ($image) {
            $data['image_path'] = $this->uploadProductImage($image);
        }
        $this->request()->patch($this->endpoint('products').'?id=eq.'.rawurlencode($id), $data)->throw();
    }

    public function deleteProduct(string $id): void
    {
        $this->ensureConfigured();
        $this->request()->delete($this->endpoint('products').'?id=eq.'.rawurlencode($id))->throw();
    }

    /** @return array{is_open: bool, opening_time: string, closing_time: string} */
    public function storeSettings(): array
    {
        $this->ensureConfigured();
        $rows = $this->request()->get($this->endpoint('store_settings'), [
            'select' => 'key,value', 'key' => 'in.(is_open,opening_time,closing_time)',
        ])->throw()->json();
        $values = collect($rows)->mapWithKeys(fn (array $row): array => [$row['key'] => $row['value']]);

        return [
            'is_open' => ($values->get('is_open') ?? true) !== false,
            'opening_time' => is_string($values->get('opening_time')) ? $values->get('opening_time') : '07:00',
            'closing_time' => is_string($values->get('closing_time')) ? $values->get('closing_time') : '15:30',
        ];
    }

    /** @param array{is_open: bool, opening_time: string, closing_time: string} $settings */
    public function updateStoreSettings(array $settings): void
    {
        $this->ensureConfigured();
        $rows = collect($settings)->map(fn (mixed $value, string $key): array => ['key' => $key, 'value' => $value])->values()->all();
        $this->request()->withHeaders(['Prefer' => 'resolution=merge-duplicates,return=minimal'])
            ->post($this->endpoint('store_settings').'?on_conflict=key', $rows)->throw();
    }

    /** @return array<int, array<string, mixed>> */
    public function pendingCashPayments(): array
    {
        $this->ensureConfigured();

        return $this->request()->get($this->endpoint('payments'), [
            'select' => 'id,order_id,method,status,amount,created_at,order:orders!payments_order_id_fkey(id,order_number,status,fulfillment_method,location_block,location_room,location_note,created_at,customer:profiles!orders_user_id_fkey(name,nis,class_name),items:order_items(product_name,quantity))',
            'method' => 'eq.cash',
            'status' => 'eq.unpaid',
            'order' => 'created_at.desc',
            'limit' => 100,
        ])->throw()->json();
    }

    /** @return array<int, array<string, mixed>> */
    public function activeOrders(): array
    {
        $this->ensureConfigured();

        return $this->request()->get($this->endpoint('orders'), [
            'select' => 'id,order_number,status,fulfillment_method,total,created_at,location_block,location_room,location_note,order_note,customer:profiles!orders_user_id_fkey(name,nis,class_name),items:order_items(id,product_name,quantity),payment:payments!inner(method,status,amount)',
            'status' => 'not.in.(completed,rejected)',
            'payment.method' => 'eq.cash',
            'order' => 'created_at.asc',
            'limit' => 100,
        ])->throw()->json();
    }

    public function transitionOrderStatus(string $orderId, string $status, ?string $note, string $staffName): void
    {
        $this->ensureConfigured();

        $this->request()->post($this->endpoint('rpc/staff_transition_order_status'), [
            'p_order_id' => $orderId,
            'p_status' => $status,
            'p_note' => $note,
            'p_staff_name' => $staffName,
        ])->throw();
    }

    public function confirmCashPayment(string $orderId): bool
    {
        $this->ensureConfigured();

        $response = $this->request()->withHeaders(['Prefer' => 'return=representation'])
            ->patch($this->endpoint('payments').'?order_id=eq.'.rawurlencode($orderId).'&method=eq.cash&status=eq.unpaid', [
                'status' => 'paid',
                'verified_at' => now()->toIso8601String(),
            ])->throw();

        return count($response->json() ?? []) === 1;
    }

    private function uploadProductImage(UploadedFile $image): string
    {
        $path = Str::uuid().'.'.$image->guessExtension();
        $this->request()->withHeaders([
            'Content-Type' => $image->getMimeType() ?? 'application/octet-stream',
            'x-upsert' => 'false',
        ])->withBody($image->getContent(), $image->getMimeType() ?? 'application/octet-stream')
            ->send('POST', $this->storageEndpoint('product-images', $path))->throw();

        return $path;
    }

    private function request(): PendingRequest
    {
        $this->ensureConfigured();

        return Http::baseUrl(rtrim((string) config('services.supabase.url'), '/'))
            ->withHeaders(['apikey' => (string) config('services.supabase.secret_key'), 'Accept' => 'application/json'])
            ->timeout(15);
    }

    private function endpoint(string $table): string
    {
        return '/rest/v1/'.$table;
    }

    private function storageEndpoint(string $bucket, string $path): string
    {
        return '/storage/v1/object/'.$bucket.'/'.implode('/', array_map('rawurlencode', explode('/', $path)));
    }

    private function ensureConfigured(): void
    {
        if (! $this->configured()) {
            throw new RuntimeException('Integrasi pengelolaan Supabase belum dikonfigurasi. Tambahkan SUPABASE_SECRET_KEY pada .env (khusus server), lalu restart aplikasi.');
        }
    }
}
