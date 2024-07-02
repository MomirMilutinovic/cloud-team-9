import {Injectable} from '@angular/core';
import {MovieInfo} from "./models/models.module";
import {SubscriptionInfo} from "./models/models.module";
import {catchError, map, Observable, of} from "rxjs";
import {BehaviorSubject, catchError, map, Observable, of} from "rxjs";
import {HttpClient, HttpHeaders, HttpParams, HttpResponse} from "@angular/common/http";
import {environment} from "../../env/env";

@Injectable({
  providedIn: 'root'
})
export class MovieService {


  constructor(private httpClient:HttpClient) { }

  private moviesSubject = new BehaviorSubject<MovieInfo[]>([]);

  getMovies() {
    return this.moviesSubject.asObservable();
  }

  setMovies(movies: MovieInfo[]) {
    this.moviesSubject.next(movies);
  }

  getAll(): Observable<MovieInfo[]> {
    const url = environment.apiHost + 'movies_info';
    return this.httpClient.get<any[]>(url)
  }

  getMovieInfo(id: string,timestamp:number): Observable<MovieInfo>  {
    const url = environment.apiHost + 'movie_info';
    let params = new HttpParams();
    params = params.append('movie_id', id);
    params = params.append('timestamp', timestamp);

    return this.httpClient.get<MovieInfo>(url, { params });
  }
  getMovie(id: string): Observable<HttpResponse<any>>  {
    const url = environment.apiHost + 'movies/download/'+id;
    return this.httpClient.get<any>(url, {responseType: 'blob' as 'json', observe: 'response' });
  }
  search(query: string): Observable<MovieInfo[]>  {
    const url = environment.apiHost + 'movies/search';
    let params = new HttpParams();
    params = params.append('params', query);
    return this.httpClient.get<MovieInfo[]>(url,{params});
  }
  editMovie(movieInfo: MovieInfo): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    });
    const url = environment.apiHost + 'movie_info';
    return this.httpClient.put<any>(url,  movieInfo, {headers})
  }

  deleteMovie(id: string, timestamp: number) {
    const url = environment.apiHost + 'movies';
    let params = new HttpParams();
    params = params.append('movie_id', id);
    params = params.append('timestamp', timestamp);
    return this.httpClient.delete<any>(url, {params});
  }
}
