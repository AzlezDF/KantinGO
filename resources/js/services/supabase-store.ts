import { supabase } from '@/lib/supabase';

export type Category = {
    id: string;
    name: string;
    slug: string;
    icon_name: string | null;
};
export type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    image_path: string | null;
    sold_count: number;
    category: Category;
};

export type CartItem = {
    id: string;
    quantity: number;
    product: Product;
};

export type CustomerOrder = {
    id: string;
    order_number: string;
    status: string;
    fulfillment_method: 'delivery' | 'pickup';
    total: number;
    created_at: string;
    location_block: string | null;
    location_room: string | null;
    items: { id: string; product_name: string; quantity: number }[];
    payment: { method: string; status: string } | null;
};

function assertNoError(error: { message: string } | null): void {
    if (error) {
        throw new Error(error.message);
    }
}

function firstRelated<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function productImageUrl(path: string | null): string | null {
    return path
        ? supabase.storage.from('product-images').getPublicUrl(path).data
              .publicUrl
        : null;
}

export async function loadCatalog(): Promise<{
    categories: Category[];
    products: Product[];
}> {
    const [categoriesResult, productsResult] = await Promise.all([
        supabase
            .from('categories')
            .select('id, name, slug, icon_name')
            .order('name'),
        supabase
            .from('products')
            .select(
                'id, name, description, price, stock, image_path, sold_count, category:categories(id, name, slug, icon_name)',
            )
            .eq('is_available', true)
            .order('sold_count', { ascending: false }),
    ]);

    assertNoError(categoriesResult.error);
    assertNoError(productsResult.error);

    return {
        categories: categoriesResult.data ?? [],
        products: (productsResult.data ?? []).flatMap((product) => {
            const category = firstRelated(product.category);

            return category ? [{ ...product, category } as Product] : [];
        }),
    };
}

async function currentUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    assertNoError(error);

    if (!data.user) {
        throw new Error('Silakan masuk terlebih dahulu.');
    }

    return data.user.id;
}

async function getOrCreateCartId(): Promise<string> {
    const userId = await currentUserId();
    const existing = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    assertNoError(existing.error);

    if (existing.data) {
        return existing.data.id;
    }

    const created = await supabase
        .from('carts')
        .insert({ user_id: userId })
        .select('id')
        .single();
    assertNoError(created.error);

    if (!created.data) {
        throw new Error('Keranjang tidak dapat dibuat.');
    }

    return created.data.id;
}

export async function addProductToCart(product: Product): Promise<void> {
    if (product.stock < 1) {
        throw new Error('Produk ini sedang habis.');
    }

    const cartId = await getOrCreateCartId();
    const existing = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', product.id)
        .maybeSingle();
    assertNoError(existing.error);

    const quantity = (existing.data?.quantity ?? 0) + 1;
    if (quantity > product.stock) {
        throw new Error('Jumlah pesanan melebihi stok yang tersedia.');
    }

    const result = existing.data
        ? await supabase
              .from('cart_items')
              .update({ quantity })
              .eq('id', existing.data.id)
        : await supabase
              .from('cart_items')
              .insert({ cart_id: cartId, product_id: product.id, quantity });
    assertNoError(result.error);
}

export async function loadCart(): Promise<CartItem[]> {
    const cartId = await getOrCreateCartId();
    const result = await supabase
        .from('cart_items')
        .select(
            'id, quantity, product:products(id, name, description, price, stock, image_path, sold_count, category:categories(id, name, slug, icon_name))',
        )
        .eq('cart_id', cartId)
        .order('created_at');
    assertNoError(result.error);

    return (result.data ?? []).flatMap((item) => {
        const product = firstRelated(item.product);
        const category = product ? firstRelated(product.category) : null;

        return product && category
            ? [{ ...item, product: { ...product, category } } as CartItem]
            : [];
    });
}

export async function setCartItemQuantity(
    item: CartItem,
    quantity: number,
): Promise<void> {
    if (quantity < 1) {
        await removeCartItem(item.id);
        return;
    }

    if (quantity > item.product.stock) {
        throw new Error('Jumlah pesanan melebihi stok terbaru.');
    }

    const result = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', item.id);
    assertNoError(result.error);
}

export async function removeCartItem(cartItemId: string): Promise<void> {
    const result = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);
    assertNoError(result.error);
}

export async function checkoutCart(input: {
    fulfillmentMethod: 'delivery' | 'pickup';
    locationBlock: string;
    locationRoom: string;
    locationNote: string;
    orderNote: string;
    paymentMethod: 'cash' | 'qris';
    idempotencyKey: string;
}): Promise<string> {
    const result = await supabase.rpc('checkout_cart', {
        p_fulfillment_method: input.fulfillmentMethod,
        p_location_block: input.locationBlock,
        p_location_room: input.locationRoom,
        p_location_note: input.locationNote,
        p_order_note: input.orderNote,
        p_payment_method: input.paymentMethod,
        p_idempotency_key: input.idempotencyKey,
    });
    assertNoError(result.error);

    return result.data;
}

export async function uploadPaymentProof(
    orderId: string,
    file: File,
): Promise<void> {
    const userId = await currentUserId();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${orderId}.${extension}`;
    const upload = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { upsert: true, contentType: file.type });
    assertNoError(upload.error);

    const linked = await supabase.rpc('attach_payment_proof', {
        p_order_id: orderId,
        p_proof_path: path,
    });
    assertNoError(linked.error);
}

export async function loadStoreSettings(): Promise<{
    isOpen: boolean;
    openingTime: string;
    closingTime: string;
    qrisImageUrl: string | null;
}> {
    const settings = await supabase
        .from('store_settings')
        .select('key, value')
        .in('key', [
            'is_open',
            'opening_time',
            'closing_time',
            'qris_image_path',
        ]);
    assertNoError(settings.error);
    const values = new Map(
        (settings.data ?? []).map((setting) => [setting.key, setting.value]),
    );
    const qrisPath = values.get('qris_image_path');

    if (typeof qrisPath !== 'string') {
        return {
            isOpen: values.get('is_open') !== false,
            openingTime:
                typeof values.get('opening_time') === 'string'
                    ? values.get('opening_time')
                    : '07:00',
            closingTime:
                typeof values.get('closing_time') === 'string'
                    ? values.get('closing_time')
                    : '15:30',
            qrisImageUrl: null,
        };
    }

    const signed = await supabase.storage
        .from('qris')
        .createSignedUrl(qrisPath, 300);
    assertNoError(signed.error);

    if (!signed.data) {
        throw new Error('Gambar QRIS tidak dapat diakses.');
    }

    return {
        isOpen: values.get('is_open') !== false,
        openingTime:
            typeof values.get('opening_time') === 'string'
                ? values.get('opening_time')
                : '07:00',
        closingTime:
            typeof values.get('closing_time') === 'string'
                ? values.get('closing_time')
                : '15:30',
        qrisImageUrl: signed.data.signedUrl,
    };
}

export async function loadMyOrders(): Promise<CustomerOrder[]> {
    const result = await supabase
        .from('orders')
        .select(
            'id, order_number, status, fulfillment_method, total, created_at, location_block, location_room, items:order_items(id, product_name, quantity), payment:payments(method, status)',
        )
        .order('created_at', { ascending: false });
    assertNoError(result.error);

    return (result.data ?? []).map(
        (order) =>
            ({
                ...order,
                items: order.items ?? [],
                payment: firstRelated(order.payment),
            }) as CustomerOrder,
    );
}
