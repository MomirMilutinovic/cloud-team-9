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

  download(movieId: string | undefined) {
    // @ts-ignore
    this.movieService.getMovie(movieId).subscribe(
      (response: HttpResponse<any>) => {
        let dataType = response.type;
        let binaryData = [];
        binaryData.push(response.body);
        let downloadLink = document.createElement('a');
        downloadLink.href = window.URL.createObjectURL(new Blob(binaryData, {type: dataType.toString()}));
        if (movieId)
            downloadLink.setAttribute('download', movieId);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.parentNode?.removeChild(downloadLink);
      },
      error => {
        console.error('Error:', error);
      }
    );
  }



}
