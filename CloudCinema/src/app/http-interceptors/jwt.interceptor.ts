import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, from, lastValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class JWTInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Preuzeto od: https://stackoverflow.com/questions/45345354/how-use-async-service-into-angular-httpclient-interceptor
    return from(this.handle(req, next))

  }

  async handle(req: HttpRequest<any>, next: HttpHandler) {
    let idToken = (await this.authService.getIdToken());

    if (req.headers.get('skip')) {
      req.headers.delete('skip');
      return lastValueFrom(next.handle(req));
    }


    if (idToken) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', idToken),
      });

      return lastValueFrom(next.handle(cloned));
    } else {
      return lastValueFrom(next.handle(req));
    }
  }
}