import {Component, Input, OnInit} from '@angular/core';
import {MovieInfo, WatchInfo} from "../models/models.module";
import {MovieService} from "../movie.service";
import {HttpResponse} from "@angular/common/http";
import {Router} from "@angular/router";
import { AuthService } from 'src/app/auth/auth.service';
import {MatSnackBar} from "@angular/material/snack-bar";
import { MatDialog } from '@angular/material/dialog';
import { DownloadDialogComponent } from '../download-dialog/download-dialog.component';


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

  constructor(private snackBar:MatSnackBar,private movieService: MovieService, private authService: AuthService, private router: Router, private matDialog: MatDialog) {
    this.editDisabled = true;
  }

  ngOnInit(): void {
    this.authService.isAdmin().then((isAdmin) => this.editDisabled = !isAdmin)
  }

  download(movie:MovieInfo) {
    if (movie.id) {
      this.matDialog.open(DownloadDialogComponent, {
        width: '400px',
        data: {movie: movie}
      });
    }
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
        this.snackBar.open("Movie deleted!", 'Close', {
          duration: 3000,
        });
      },
      error => {
        this.snackBar.open("Error during deleting movie!", 'Close', {
          duration: 3000,
        });
        console.error('Error:', error);
      }
    );
  }
}
