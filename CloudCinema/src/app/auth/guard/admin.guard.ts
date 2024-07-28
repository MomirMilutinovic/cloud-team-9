import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const adminGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const isAdmin = await authService.isAdmin();

    if (!isAdmin) {
      router.navigate(['home']);
      return false;
    }

    return true;
};