import {Injectable} from '@angular/core';
import {MovieInfo} from "./models/models.module";
import {map, Observable} from "rxjs";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {environment} from "../../env/env";

@Injectable({
  providedIn: 'root'
})
export class MovieService {


  constructor(private httpClient:HttpClient) { }

  getAll(): Observable<MovieInfo[]> {
    return this.httpClient.get<MovieInfo[]>(environment.apiHost + 'moviesInfo')
  }

  getMovie(name: string): Observable<HttpResponse<any>>  {
    const url = environment.apiHost+'movies/bunny.mp4';
    return this.httpClient.get<any>(url, {responseType: 'blob' as 'json', observe: 'response' });
  }
}
