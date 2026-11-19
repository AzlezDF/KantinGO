import { home, login as loginPage, register as registerPage } from '@/routes';
import {
    destroy as destroyCartItem,
    update as updateCartItem,
} from '@/routes/cart-items';
import { show as showCart, store as storeCart } from '@/routes/cart';
import {
    create as createCheckout,
    store as storeCheckout,
} from '@/routes/checkout';
import { dashboard as adminDashboard } from '@/routes/admin';
import {
    destroy as destroyProduct,
    index as indexProducts,
    store as storeProduct,
    update as updateProduct,
} from '@/routes/admin/products';
import { index as indexOrders } from '@/routes/orders';
import { store as login } from '@/routes/login';
import { store as register } from '@/routes/register';
import {
    index as indexStaffOrders,
    updatePayment,
    updateStatus,
} from '@/routes/staff/orders';
import {
    index as staffMenu,
    store as storeStaffMenu,
    update as updateStaffMenu,
    destroy as deleteStaffMenu,
} from '@/routes/staff/menu';
import {
    edit as editStoreSettings,
    update as updateStoreSettings,
} from '@/routes/staff/store-settings';

/** Small domain-oriented facade over the Wayfinder-generated route functions. */
export const kantingo = {
    home,
    auth: {
        login: loginPage,
        loginStore: login,
        register: registerPage,
        registerStore: register,
    },
    cart: {
        show: showCart,
        store: storeCart,
        item: (cartItem: number) => ({
            update: updateCartItem(cartItem),
            destroy: destroyCartItem(cartItem),
            url: () => updateCartItem.url(cartItem),
        }),
    },
    checkout: { create: createCheckout, store: storeCheckout },
    orders: indexOrders,
    staff: {
        orders: indexStaffOrders,
        status: updateStatus,
        payment: updatePayment,
        menu: staffMenu,
        menuStore: storeStaffMenu,
        menuUpdate: updateStaffMenu,
        menuDelete: deleteStaffMenu,
        storeSettings: editStoreSettings,
        storeSettingsUpdate: updateStoreSettings,
    },
    admin: {
        dashboard: adminDashboard,
        products: indexProducts,
        productStore: storeProduct,
        product: (product: number) => ({
            update: updateProduct(product),
            destroy: destroyProduct(product),
            url: () => destroyProduct.url(product),
        }),
    },
};
