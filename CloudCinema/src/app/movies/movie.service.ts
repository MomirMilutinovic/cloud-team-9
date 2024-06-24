import {Injectable} from '@angular/core';
import {MovieInfo} from "./models/models.module";
import {catchError, map, Observable, of} from "rxjs";
import {HttpClient, HttpResponse} from "@angular/common/http";
import {environment} from "../../env/env";

@Injectable({
  providedIn: 'root'
})
export class MovieService {


  constructor(private httpClient:HttpClient) { }

  getAll(): Observable<MovieInfo[]> {
    const url = environment.apiHost + 'movies_info';
    return this.httpClient.get<any[]>(url)
    .pipe(map(response => {
        return response.length > 0 ? response.map(({ id, name, actors, director, year }) => ({
          id: id.S,
          name: name.S,
          actors: actors?.L.map((actor: { S: string }) => actor.S) || [],
          director: director.S,
          year: year ? parseInt(year.N, 10) : undefined
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching movies:', error);
        return [];
      })
    );
  }


  getMovie(id: string): Observable<HttpResponse<any>>  {
    const url = environment.apiHost+'movies/'+id;
    return this.httpClient.get<any>(url, {responseType: 'blob' as 'json', observe: 'response' });
  }
}
