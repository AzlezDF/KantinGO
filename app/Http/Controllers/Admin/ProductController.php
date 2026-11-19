<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', Product::class);

        return Inertia::render('admin/products/index', [
            'products' => Product::query()->with('category:id,name')->latest()->get(),
            'categories' => Category::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $this->authorize('create', Product::class);
        $data = $request->safe()->except('image');
        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(6));

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        Product::create($data);

        return back()->with('success', 'Produk ditambahkan.');
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $this->authorize('update', $product);
        $data = $request->safe()->except('image');

        if ($request->hasFile('image')) {
            if ($product->image_path !== null) {
                Storage::disk('public')->delete($product->image_path);
            }

            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product->update($data);

        return back()->with('success', 'Produk diperbarui.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->authorize('delete', $product);
        $product->delete();

        return back()->with('success', 'Produk dihapus.');
    }
}
