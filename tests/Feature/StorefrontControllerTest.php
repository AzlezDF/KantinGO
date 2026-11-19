<?php

use App\Enums\UserRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests opening the storefront are sent to login', function () {
    $this->get(route('home'))->assertRedirect(route('login'));
});

test('students opening the storefront are sent to their dashboard', function () {
    $this->actingAs(User::factory()->create())->get(route('home'))->assertRedirect(route('dashboard'));
});

test('student dashboard renders the menu storefront', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->component('storefront/index'));
});

test('staff opening the storefront are sent to incoming orders', function () {
    $staff = User::factory()->create(['role' => UserRole::Staff]);

    $this->actingAs($staff)->get(route('home'))->assertRedirect(route('staff.orders.index'));
});

test('administrators opening the storefront are sent to administration', function () {
    $administrator = User::factory()->create(['role' => UserRole::Admin]);

    $this->actingAs($administrator)->get(route('home'))->assertRedirect(route('admin.dashboard'));
});
