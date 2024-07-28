import { Injectable } from '@angular/core';
import {HttpClient, HttpParams, HttpResponse} from "@angular/common/http";
import {catchError, map, Observable} from "rxjs";
import {MovieInfo, Subscription, SubscriptionInfo} from "../models/models.module";
import {environment} from "../../../env/env";

@Injectable({
  providedIn: 'root'
})
export class SubscriptionsService {

  constructor(private httpClient:HttpClient) { }


  subscribeSNS(subscription: SubscriptionInfo): Observable<HttpResponse<any>>  {
    const url = environment.apiHost + 'subscribe';
    return this.httpClient.post<any>(url, subscription);
  }

  getAll(email:string): Observable<Subscription[]> {
    const url = environment.apiHost + 'subscribe';
    let params = new HttpParams();
    params = params.append('email', email);
    return this.httpClient.get<Subscription[]>(url,{params})
  }

  delete(email:string,sub:string){
    const url = environment.apiHost + 'subscribe';
    let params = new HttpParams();
    params = params.append('email', email);
    params = params.append('sub', sub);
    return this.httpClient.delete<any>(url, {params});
  }
}
