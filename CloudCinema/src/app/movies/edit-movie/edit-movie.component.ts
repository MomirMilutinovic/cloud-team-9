import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {MovieService} from "../movie.service";
import {MovieInfo} from "../models/models.module";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'app-edit-movie',
  templateUrl: './edit-movie.component.html',
  styleUrls: ['./edit-movie.component.css']
})

export class EditMovieComponent implements OnInit{

  movieForm: FormGroup;
  movieId:string|null;
  timestamp:number;
  movie:MovieInfo;

  constructor(private route: ActivatedRoute, private service: MovieService,
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

    this.route.paramMap.subscribe(params => {
      this.movieId = params.get('id');
      this.timestamp = parseInt(<string>params.get('timestamp'));

      // @ts-ignore
      this.service.getMovieInfo(this.movieId, this.timestamp).subscribe(value => {
        this.movie = value;
        this.movieForm.patchValue(this.movie);
      })
    });
  }

  onSave() {
    const updatedMovie: MovieInfo = {
      id: this.movie?.id,
      name: this.movieForm.value.name as string,
      description: this.movieForm.value.description as string,
      director: this.movieForm.value.director as string,
      genres: this.movieForm.value.genres.toString().split(','),
      actors: this.movieForm.value.actors.toString().split(','),
      year: this.movieForm.value.year as number,
      timestamp: this.movie.timestamp,
      episode:this.movieForm.value.episode as string,
    };

    console.log(updatedMovie)

    this.service.editMovie(updatedMovie).subscribe(
      {
        next: () => {
          console.log('success!')
        },
        error: (_) => {
        }
      }
    );
  }
}
