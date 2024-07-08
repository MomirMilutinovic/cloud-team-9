
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const isLoggedIn = await authService.isLoggedIn();

    if (!isLoggedIn) {
      router.navigate(['login']);
      return false;
    }

    return true;
};