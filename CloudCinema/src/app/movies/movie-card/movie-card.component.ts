import {Component, Input} from '@angular/core';
import {MovieInfo} from "../models/models.module";
import {MovieService} from "../movie.service";
import {HttpResponse} from "@angular/common/http";

@Component({
  selector: 'app-movie-card',
  templateUrl: './movie-card.component.html',
  styleUrls: ['./movie-card.component.css']
})
export class MovieCardComponent {
  @Input()
  movie: MovieInfo;

  constructor(private movieService: MovieService) {
  }

  download(movieName: string | undefined) {
    // @ts-ignore
    this.movieService.getMovie().subscribe(
      (response: HttpResponse<any>) => {
        if (response.status === 302) {
          const redirectUrl = response.headers.get('Location');
          if (redirectUrl) {
            window.location.href = redirectUrl;
          } else {
            console.error('Error: No redirect URL found');
          }
        } else {
          console.error('Unexpected status code:', response.status);
        }
      },
      error => {
        console.error('Error:', error);
      }
    );
  }



}
