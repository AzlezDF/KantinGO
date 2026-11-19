<?php

namespace App\Actions\Fortify;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        $validated = Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'nis' => ['required', 'string', 'min:6', 'max:30', 'unique:users,nis'],
            'class_name' => ['required', 'string', 'max:80'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ])->validate();

        return User::create([
            ...$validated,
            'email' => strtolower($validated['nis']).'@students.kantingo.local',
            'role' => UserRole::Student,
        ]);
    }
}
