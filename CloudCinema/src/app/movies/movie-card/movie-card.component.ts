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
    this.movieService.getMovie(movieName).subscribe((response: HttpResponse<any>) => {
      const url = response.headers.get('Location');
      if (url) {
        window.location.href = url;
      } else {
        alert('Error: Unable to download movie');
      }
    }, error => {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    });
  }


}
