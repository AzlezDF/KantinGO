<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        if (! $request->user()) {
            return to_route('login');
        }

        if ($request->user()->isAdmin()) {
            return to_route('admin.dashboard');
        }

        if ($request->user()->isStaff()) {
            return to_route('staff.orders.index');
        }

        return to_route('dashboard');
    }

    public function orders(): Response
    {
        return Inertia::render('orders/index');
    }
}
