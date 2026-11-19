<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Category;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect(['Makanan Berat', 'Makanan Ringan', 'Minuman', 'Jajanan'])->mapWithKeys(function (string $name): array {
            $category = Category::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name]);

            return [$name => $category];
        });

        collect([
            ['Nasi Goreng Spesial', 'Makanan Berat', 12000, 20, 'Nasi goreng hangat dengan telur dan kerupuk.'],
            ['Mie Ayam Bakso', 'Makanan Berat', 10000, 18, 'Mie ayam gurih dengan bakso.'],
            ['Es Teh Manis', 'Minuman', 3000, 50, 'Teh manis dingin yang menyegarkan.'],
            ['Jus Jeruk', 'Minuman', 5000, 25, 'Jus jeruk segar pilihan.'],
            ['Roti Bakar Cokelat', 'Makanan Ringan', 7000, 15, 'Roti bakar dengan selai cokelat.'],
            ['Sosis Bakar', 'Jajanan', 5000, 30, 'Sosis panggang dengan saus pilihan.'],
        ])->each(function (array $product) use ($categories): void {
            [$name, $category, $price, $stock, $description] = $product;
            Product::firstOrCreate(['slug' => Str::slug($name)], [
                'category_id' => $categories[$category]->id,
                'name' => $name,
                'description' => $description,
                'price' => $price,
                'stock' => $stock,
                'is_available' => true,
            ]);
        });

        StoreSetting::firstOrCreate(['key' => 'is_open'], ['value' => 'true']);

        User::firstOrCreate(['email' => 'admin@kantingo.test'], [
            'name' => 'Admin KantinGO',
            'nis' => 'ADMIN001',
            'class_name' => null,
            'password' => Hash::make('password'),
            'role' => UserRole::Admin,
        ]);

        User::firstOrCreate(['email' => 'petugas@kantingo.test'], [
            'name' => 'Petugas Kantin',
            'nis' => 'STAFF001',
            'class_name' => null,
            'password' => Hash::make('password'),
            'role' => UserRole::Staff,
        ]);
    }
}
