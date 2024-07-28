import {Injectable} from '@angular/core';
import {MovieInfo, PresignedUrl, RatingInfo, WatchInfo} from "./models/models.module";
import {SubscriptionInfo} from "./models/models.module";
import {BehaviorSubject, catchError, map, Observable, of, switchMap, tap} from "rxjs";
import {HttpClient, HttpHeaders, HttpParams, HttpResponse} from "@angular/common/http";
import {environment} from "../../env/env";
import { FFmpeg } from '@diffusion-studio/ffmpeg-js';


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


  getAll(email:string): Observable<MovieInfo[]> {
    const url = environment.apiHost + 'movies_info';
    let params = new HttpParams();
    params = params.append('email', email);
    return this.httpClient.get<any[]>(url,{params});
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

  updateWatchHistory(info: WatchInfo): Observable<HttpResponse<any>>  {
    const url = environment.apiHost + 'update_watch_history';
    return this.httpClient.post<any>(url, info);
  }
  updateDownloadHistory(info: WatchInfo): Observable<HttpResponse<any>>  {
    const url = environment.apiHost + 'update_download_history';
    return this.httpClient.post<any>(url, info);
  }

  rateMovie(info: RatingInfo): Observable<HttpResponse<any>>  {
    const url = environment.apiHost + 'rate';
    return this.httpClient.post<any>(url, info);
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

  getAllScan(name: string, actors: string, genres: string, director: string,description:string) {
    const url = environment.apiHost + 'movies/scan';
    let params = new HttpParams();
    params = params.append('movie_name',name);
    params = params.append('actors', actors);
    params = params.append('genres', genres);
    params = params.append('director', director);
    params = params.append('description', description);
    return this.httpClient.get<MovieInfo[]>(url,{params});
  }

  getEpisodes(name: string): Observable<MovieInfo[]>  {
    const url = environment.apiHost + 'movies_info/episodes';
    let params = new HttpParams();
    params = params.append('series_name', name);
    return this.httpClient.get<MovieInfo[]>(url, { params });
  }

  uploadFile(presignedUrl: string, file: File) {
    return this.httpClient.put(presignedUrl, file, {
      headers: {
        'skip': 'true',
        'Content-Type': 'application/octet-stream'
      }
    });
  }

  editMovieFile(id: string, file: File) {
    const movieFileEditUrl = environment.apiHost + 'movie_file';
    return this.httpClient.put<PresignedUrl>(movieFileEditUrl, {id}).pipe(
      switchMap(
        response => {
          console.log('Uploading film', response.uploadUrl);
          return this.uploadFile(response.uploadUrl, file);
        }
      ),
      catchError(error => {
        console.error('Error getting presigned URL:', error);
        return of(null);
      })
    )
  }

  uploadMovie(movie: MovieInfo, file: File) {
    const movieInfoUploadUrl = environment.apiHost + '/movies'
    return this.httpClient.post<PresignedUrl>(movieInfoUploadUrl, movie).pipe(
      switchMap(
        response => {
          console.log('Uploading film', response.uploadUrl);
          return this.uploadFile(response.uploadUrl, file);
        }
      ),
      catchError(error => {
        console.error('Error getting presigned URL:', error);
        return of(null);
      })
    );
  }

  download(id: string, quality: string, callback?: (() => void)) {
    const ffmpeg = new FFmpeg();
    const playlistFileName = `${id}_${quality}.m3u8`;
    ffmpeg.whenReady(async () => {
      await this.downloadSegments(id, quality, ffmpeg);
      await ffmpeg.exec(['-i', playlistFileName, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', 'download.mp4'])
      const result: Uint8Array = ffmpeg.readFile('download.mp4');
      this.downloadData(result, id, quality, 'video/mp4')
      if (callback) {
        callback();
      }
      ffmpeg.clearMemory();
    });
  }

  private async downloadSegments(id: string, quality: string, ffmpeg: FFmpeg) {
      const source = environment.transcodedMovieBucketUrl + id + '_' + quality + '.m3u8';
      const playlistFileName = `${id}_${quality}.m3u8`;
      await ffmpeg.writeFile(playlistFileName, source);
      const playlistAsString = new TextDecoder().decode(ffmpeg.readFile(playlistFileName));
      const segmentFilenames = playlistAsString.split('\n').filter(line => !line.startsWith('#') && (line.trim() != ''));
      const segmentDownloads = segmentFilenames.map((filename) => {
        return ffmpeg.writeFile(filename, environment.transcodedMovieBucketUrl + filename);
      });
      await Promise.all(segmentDownloads)
  }

  private downloadData(file: Uint8Array, id: string, quality: string, mimeType: string) {
    // Taken from https://github.com/diffusion-studio/ffmpeg-js/blob/main/examples/src/main.ts
    const a = document.createElement('a');
    document.head.appendChild(a);
    a.download = `${id}_${quality}.${mimeType.split("/").at(1)}`
    a.href = URL.createObjectURL(
      new Blob([file], { type: mimeType })
    )
    a.click();
  }

  getQualities(id: string): Observable<string[]> {
    const url = environment.transcodedMovieBucketUrl + id + '.m3u8';
    return this.httpClient.get(url, {responseType: 'text', headers: {'skip': 'true'}}).pipe(
      map((playlist: string) => {
        return playlist.split('\n').filter(line => !line.startsWith('#') && (line.trim() != '')).map(line => line.split('_')[1].split('.')[0])
      })
    );
  }

}
