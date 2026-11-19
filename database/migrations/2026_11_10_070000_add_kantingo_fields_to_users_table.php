<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('nis')->nullable()->unique()->after('name');
            $table->string('class_name')->nullable()->after('nis');
            $table->string('role')->default('student')->index()->after('password');
            $table->boolean('is_active')->default(true)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['nis']);
            $table->dropColumn(['nis', 'class_name', 'role', 'is_active']);
        });
    }
};
