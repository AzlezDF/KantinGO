<?php

namespace App\Actions;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use UnexpectedValueException;

class SupabaseManagement
{
    private const PAGE_SIZE = 1000;

    public function configured(): bool
    {
        return filled(config('services.supabase.url')) && filled(config('services.supabase.secret_key'));
    }

    /**
     * @return array{
     *     stats: array{salesToday: int, ordersToday: int, products: int, students: int, staff: int, processing: int},
     *     popularProducts: array<int, array{id: string, name: string, sold_count: int, stock: int}>,
     *     salesByDay: array<int, array{label: string, total: int}>
     * }
     */
    public function adminDashboard(): array
    {
        $today = now()->startOfDay();
        $tomorrow = $today->copy()->addDay();
        $weekStart = $today->copy()->subDays(6);

        $orders = $this->getRows('orders', [
            'select' => 'total,status,created_at',
            'created_at' => 'gte.'.$weekStart->toIso8601String(),
            'order' => 'created_at.asc,id.asc',
        ]);
        $dailySales = array_fill_keys(
            array_map(
                fn (int $daysAgo): string => $today->copy()->subDays($daysAgo)->toDateString(),
                range(6, 0),
            ),
            0,
        );
        $ordersToday = 0;

        foreach ($orders as $order) {
            if (
                ! is_string($order['created_at'] ?? null)
                || ! is_string($order['status'] ?? null)
                || ! is_numeric($order['total'] ?? null)
            ) {
                throw new UnexpectedValueException('Supabase returned an invalid order for the admin dashboard.');
            }

            $createdAt = Carbon::parse($order['created_at']);

            if ($createdAt->greaterThanOrEqualTo($today) && $createdAt->lessThan($tomorrow)) {
                $ordersToday++;
            }

            $date = $createdAt->toDateString();

            if ($order['status'] === 'completed' && array_key_exists($date, $dailySales)) {
                $dailySales[$date] += (int) $order['total'];
            }
        }

        $popularProducts = $this->getRows('products', [
            'select' => 'id,name,sold_count,stock',
            'order' => 'sold_count.desc,id.asc',
            'limit' => 5,
        ]);
        $popularProducts = array_map(static function (array $product): array {
            if (
                ! is_string($product['id'] ?? null)
                || ! is_string($product['name'] ?? null)
                || ! is_numeric($product['sold_count'] ?? null)
                || ! is_numeric($product['stock'] ?? null)
            ) {
                throw new UnexpectedValueException('Supabase returned an invalid product for the admin dashboard.');
            }

            return [
                'id' => $product['id'],
                'name' => $product['name'],
                'sold_count' => (int) $product['sold_count'],
                'stock' => (int) $product['stock'],
            ];
        }, $popularProducts);

        return [
            'stats' => [
                'salesToday' => $dailySales[$today->toDateString()],
                'ordersToday' => $ordersToday,
                'products' => $this->countRows('products'),
                'students' => $this->countRows('profiles', ['role' => 'eq.student']),
                'staff' => $this->countRows('profiles', ['role' => 'eq.staff']),
                'processing' => $this->countRows('orders', [
                    'status' => 'in.(accepted,preparing,ready_for_delivery,delivering)',
                ]),
            ],
            'popularProducts' => $popularProducts,
            'salesByDay' => array_map(
                fn (string $date): array => [
                    'label' => Carbon::parse($date)->locale('id')->isoFormat('dd'),
                    'total' => $dailySales[$date],
                ],
                array_keys($dailySales),
            ),
        ];
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

    /**
     * @param  array<string, string>  $query
     * @return array<int, array<string, mixed>>
     */
    private function getRows(string $table, array $query): array
    {
        $rows = [];
        $offset = 0;

        do {
            $response = $this->request()
                ->withHeaders([
                    'Range' => $offset.'-'.($offset + self::PAGE_SIZE - 1),
                    'Range-Unit' => 'items',
                ])
                ->get($this->endpoint($table), $query);
            $page = $response->throw()->json();

            if (! is_array($page) || ! array_is_list($page)) {
                throw new UnexpectedValueException("Supabase returned an invalid list for [{$table}].");
            }

            foreach ($page as $row) {
                if (! is_array($row)) {
                    throw new UnexpectedValueException("Supabase returned an invalid row for [{$table}].");
                }

                $rows[] = $row;
            }

            $pageSize = count($page);
            $offset += self::PAGE_SIZE;
        } while ($pageSize === self::PAGE_SIZE);

        return $rows;
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function countRows(string $table, array $filters = []): int
    {
        $response = $this->request()
            ->withHeaders([
                'Prefer' => 'count=exact',
                'Range' => '0-0',
                'Range-Unit' => 'items',
            ])
            ->get($this->endpoint($table), ['select' => 'id', ...$filters]);
        $response->throw();
        $contentRange = $response->header('Content-Range');

        if (preg_match('/\/(\d+)$/', $contentRange, $matches) !== 1) {
            throw new UnexpectedValueException("Supabase did not return an exact count for [{$table}].");
        }

        return (int) $matches[1];
    }

    private function ensureConfigured(): void
    {
        if (! $this->configured()) {
            throw new RuntimeException('Integrasi pengelolaan Supabase belum dikonfigurasi. Tambahkan SUPABASE_SECRET_KEY pada .env (khusus server), lalu restart aplikasi.');
        }
    }
}
