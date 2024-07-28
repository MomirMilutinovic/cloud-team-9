import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MovieService } from '../movie.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MovieInfo } from '../models/models.module';

@Component({
  selector: 'app-create-movie',
  templateUrl: './create-movie.component.html',
  styleUrls: ['./create-movie.component.css']
})
export class CreateMovieComponent implements OnInit {
  movieForm: FormGroup;
  movieId:string|null;
  timestamp:number;
  selectedFile: File;

  constructor(private snackBar:MatSnackBar, private service: MovieService,
              private fb: FormBuilder) {
  }

  ngOnInit(): void {
    this.movieForm = this.fb.group({
      id: [''], // You may want to disable editing of ID depending on your requirements
      name: ['', Validators.required],
      description: ['', Validators.required],
      genres: [[]],
      actors: [[]],
      director: ['', Validators.required],
      year: ['', Validators.required],
      timestamp: ['', Validators.required],
      episode:['',Validators.required]
    });
  }


  onSave() {
    if (!this.selectedFile) {
      this.snackBar.open("Please upload a file!", 'Close', {
        duration: 3000,
      });
      return;
    }

    const movie: MovieInfo = {
      name: this.movieForm.value.name as string,
      description: this.movieForm.value.description as string,
      director: this.movieForm.value.director as string,
      genres: this.movieForm.value.genres.toString().split(','),
      actors: this.movieForm.value.actors.toString().split(','),
      year: this.movieForm.value.year as number,
      episode:this.movieForm.value.episode as string,
    };

    console.log(movie)

    this.service.uploadMovie(movie, this.selectedFile).subscribe(
      {
        next: () => {
          this.snackBar.open("Movie edited!", 'Close', {
            duration: 3000,
          });
          console.log('success!')
        },
        error: (_) => {
          this.snackBar.open("Error during editing!", 'Close', {
            duration: 3000,
          });
        }
      }
    );
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

}
