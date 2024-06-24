import {Injectable} from '@angular/core';
import {MovieInfo} from "./models/models.module";
import {catchError, map, Observable, of} from "rxjs";
import {HttpClient, HttpHeaders, HttpParams, HttpResponse} from "@angular/common/http";
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
        return response.length > 0 ? response.map(({ id, name, actors, director, year,timestamp }) => ({
          id: id.S,
          name: name.S,
          actors: actors?.L.map((actor: { S: string }) => actor.S) || [],
          director: director.S,
          year: year ? parseInt(year.N, 10) : undefined,
          timestamp: timestamp ? parseInt(timestamp.N, 10) : undefined

        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching movies:', error);
        return [];
      })
    );
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

  editMovie(movieInfo: MovieInfo): Observable<any> {
    const info: MovieInfo = {
        id:"dc43e0c7-e06c-4c11-be18-254d346ce9d5",
        name:"Mission Impossible 999",
        description:"",
        director:"Christopher McQuarrie",
        genres:["Action"],
        actors:["Tom Cruise", "Henry Cavill", "Ving Rhames"],
        year:2023,
        timestamp:1719182372
    }
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
    });
    const url = environment.apiHost + 'movie_info';
    return this.httpClient.put<any>(url,  info, {headers})
  }
}
