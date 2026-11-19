<?php

namespace App\Enums;

enum UserRole: string
{
    case Student = 'student';
    case Staff = 'staff';
    case Admin = 'admin';
}
