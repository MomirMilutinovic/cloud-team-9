import {Component, Input, OnInit} from '@angular/core';
import {MovieInfo, WatchInfo} from "../models/models.module";
import {MovieService} from "../movie.service";
import {HttpResponse} from "@angular/common/http";
import {Router} from "@angular/router";
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-movie-card',
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.css']
})
export class MovieCardComponent implements OnInit {
  @Input()
  movie: MovieInfo;

  userEmail:string|null;
  editDisabled = true;

  constructor(private movieService: MovieService, private authService: AuthService, private router: Router) {
    this.editDisabled = true;
  }

  ngOnInit(): void {
    this.authService.isAdmin().then((isAdmin) => this.editDisabled = !isAdmin)
  }

  download(movie:MovieInfo) {
    const userEmail = localStorage.getItem('userEmail') || ""
    const info: WatchInfo = {
      email: userEmail,
      genres: movie.genres,
      actors: movie.actors
    }
    this.movieService.updateDownloadHistory(info).subscribe(
      (response: HttpResponse<any>) => {
        console.log("SUCCESS!")
      },
      error => {
        console.error('Error:', error);
      }
    );
    // @ts-ignore
    this.movieService.getMovie(movie.id).subscribe(
      (response: HttpResponse<any>) => {
        let dataType = response.type;
        let binaryData = [];
        binaryData.push(response.body);
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, {type: dataType.toString()}));
        if (movie.id)
            downloadLink.setAttribute('download', movie.id);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.parentNode?.removeChild(downloadLink);
      },
      error => {
        console.error('Error:', error);
      }
    );
  }

  play(movieId: string |  undefined, timestamp: number | undefined) {
    //pozvati prikaz informacija

    this.router.navigate(["/details", movieId, timestamp]);

    // this.router.navigate(["/play",movieId]);
  }

  edit(id: string | undefined, timestamp: number | undefined) {
    this.router.navigate(["home/movies/movieEdit", id, timestamp]);
  }

  delete(movie: MovieInfo) {
    // @ts-ignore
    this.movieService.deleteMovie(movie.id, movie.timestamp).subscribe(
      (response: HttpResponse<any>) => {
        console.log("SUCCESS!")
      },
      error => {
        console.error('Error:', error);
      }
    );
  }
}
