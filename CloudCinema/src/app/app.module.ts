import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {LayoutModule} from "./layout/layout.module";
import {MaterialModule} from "./infrastructure/material/material.module";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatIconModule} from "@angular/material/icon";
import {NavbarComponent} from "./layout/navbar/navbar.component";
import {MoviesModule} from "./movies/movies.module";
import {HttpClientModule, HTTP_INTERCEPTORS} from "@angular/common/http";
import { Amplify } from 'aws-amplify';

import { JWTInterceptor } from './http-interceptors/jwt.interceptor';

const onS3 = true;
const redirectUrl = onS3 ? 'https://cloud-cinema-front-bucket.s3.amazonaws.com/index.html' : 'http://localhost:4200';

Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: '',
      userPoolClientId: '6tj009mjqr69l1vocv6ds506k9',
      userPoolId: 'us-east-1_GEFfqsKS2',
      loginWith: {
        email: true,
        oauth: {
          domain: 'ftn-cloud-cinema-team-9.auth.us-east-1.amazoncognito.com',
          scopes: [],
          redirectSignIn: [redirectUrl],
          redirectSignOut: [redirectUrl],
          responseType: 'code',
        },
      },
    },
  }
});

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    LayoutModule,
    MaterialModule,
    MoviesModule,
    BrowserAnimationsModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JWTInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
