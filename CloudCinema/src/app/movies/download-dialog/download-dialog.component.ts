import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MovieService } from '../movie.service';
import { MovieInfo, WatchInfo } from '../models/models.module';
import { HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-download-dialog',
  templateUrl: './download-dialog.component.html',
  styleUrls: ['./download-dialog.component.css']
})
export class DownloadDialogComponent implements OnInit {
  qualityForm: FormGroup;
  qualities: string[] = [];

  constructor(private fb: FormBuilder, 
    @Inject(MAT_DIALOG_DATA) protected data: {movie: MovieInfo},
    private movieService: MovieService,
    private dialogRef: MatDialogRef<DownloadDialogComponent>
  ) {
  }

  ngOnInit(): void {
    this.qualityForm = this.fb.group({
      quality: ['', Validators.required]
    });
    if (!this.data.movie.id) {
      return;
    }
    this.movieService.getQualities(this.data.movie.id).subscribe(
      (response: any) => {
        this.qualities = response;
      }
    );
  }

  download() {
    const userEmail = localStorage.getItem('userEmail') || ""
    const movie = this.data.movie;
    if (!movie.id) {
      return;
    }
    
    const info: WatchInfo = {
      email: userEmail,
      movie_id: movie.id,
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

    this.movieService.download(movie.id, this.qualityForm.value.quality,
      () => this.dialogRef.close()
    );
  }
}
