import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable, from, lastValueFrom } from 'rxjs';
import { fetchAuthSession } from 'aws-amplify/auth';

@Injectable()
export class JWTInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Preuzeto od: https://stackoverflow.com/questions/45345354/how-use-async-service-into-angular-httpclient-interceptor
    return from(this.handle(req, next))

  }

  async handle(req: HttpRequest<any>, next: HttpHandler) {
    //Preuzeto od: https://stackoverflow.com/questions/77627483/retrieve-raw-accesstoken-and-idtoken-in-aws-amplify-js-v6
    const { idToken }  = (await fetchAuthSession()).tokens ?? {}

    if (req.headers.get('skip')) return lastValueFrom(next.handle(req));

    if (idToken) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', idToken.toString()),
      });

      return lastValueFrom(next.handle(cloned));
    } else {
      return lastValueFrom(next.handle(req));
    }
  }
}