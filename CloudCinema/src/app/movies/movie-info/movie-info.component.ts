import { Component, Input } from '@angular/core';
import {Observable, range, toArray} from "rxjs";
import { MovieService } from '../movie.service';
import { MovieInfo, RatingInfo } from '../models/models.module';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-movie-info',
  templateUrl: './movie-info.component.html',
  styleUrls: ['./movie-info.component.css']
})
export class MovieInfoComponent {
  movieId:string
  timestamp:number
  movie:MovieInfo

  @Input() maxRatingActor =5;
  @Input() SelectedStarActor=0;
  actorAverageRating:number;
  maxRatingArrActor=[];
  previouseSelectedActor = 0;
  protected readonly Array = Array;

  @Input() maxRatingGenre =5;
  @Input() SelectedStarGenre=0;
  genreAverageRating:number;
  maxRatingArrGenre=[];
  previouseSelectedGenre = 0;

  @Input() maxRatingDirector =5;
  @Input() SelectedStarDirector=0;
  directorAverageRating:number;
  maxRatingArrDirector=[];
  previouseSelectedDirector = 0;
  isLoaded:boolean = false;

  constructor(private route: ActivatedRoute, private service: MovieService,private router:Router) {}


  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.movieId = params.get('id') || "";
      this.timestamp = parseInt(<string>params.get('timestamp'));

      // @ts-ignore
      this.service.getMovieInfo(this.movieId, this.timestamp).subscribe(value => {
        this.movie = value;
        this.isLoaded=true
      })
    });
    // @ts-ignore
    this.maxRatingArrActor = Array(this.maxRatingActor).fill(0);
    // @ts-ignore
    this.maxRatingArrDirector = Array(this.maxRatingDirector).fill(0);
    // @ts-ignore
    this.maxRatingArrGenre = Array(this.maxRatingGenre).fill(0);

   }

  HandeMouseLeaveActor() {
    if (this.previouseSelectedActor!==0){
      this.SelectedStarActor = this.previouseSelectedActor;
    }
  }
  HandleMouseEnterActor(index:number){
    this.SelectedStarActor=index+1;
  }

  RatingActor(index:number) {
    this.SelectedStarActor=index+1;
    this.previouseSelectedActor=this.SelectedStarActor;
  }


  HandeMouseLeaveGenre() {
    if (this.previouseSelectedGenre!==0){
      this.SelectedStarGenre = this.previouseSelectedGenre;
    }
  }
  HandleMouseEnterGenre(index:number){
    this.SelectedStarGenre=index+1;
  }

  RatingGenre(index:number) {
    this.SelectedStarGenre=index+1;
    this.previouseSelectedGenre=this.SelectedStarGenre;
  }


  HandeMouseLeaveDirector() {
    if (this.previouseSelectedDirector!==0){
      this.SelectedStarDirector = this.previouseSelectedDirector;
    }
  }
  HandleMouseEnterDirector(index:number){
    this.SelectedStarDirector=index+1;
  }

  RatingDirector(index:number) {
    this.SelectedStarDirector=index+1;
    this.previouseSelectedDirector=this.SelectedStarDirector;
  }

  RateActors(){
    let rateActor = this.SelectedStarActor;
    console.log(rateActor)
    const userEmail = localStorage.getItem('userEmail') || ""

    const ratingInfo : RatingInfo = {
      email: userEmail,
      type:"Actor",
      rate: rateActor,
      attributes:this.movie.actors
    }

    this.SendRate(ratingInfo)
  }


  RateDirectors() {
    let rateDirector = this.SelectedStarDirector;
    const userEmail = localStorage.getItem('userEmail') || ""
    let directors: string[] = []
    directors.push(this.movie.director || "")

    const ratingInfo : RatingInfo = {
      email: userEmail,
      rate: rateDirector,
      type:"Director",
      attributes:directors
    }

    this.SendRate(ratingInfo)
  }

  RateGenres() {
    let rateGenre = this.SelectedStarGenre;
    const userEmail = localStorage.getItem('userEmail') || ""

    const ratingInfo : RatingInfo = {
      email: userEmail,
      rate: rateGenre,
      type:"Genre",
      attributes:this.movie.genres
    }

    this.SendRate(ratingInfo)
  }

  SendRate(ratingInfo : RatingInfo) {
    this.service.rateMovie(ratingInfo).subscribe(
      {
        next: () => {
          console.log('success!')
        },
        error: (_) => {
          console.log("error")
        }
      }
    );
  }

  Play(id: string | undefined) {
    this.router.navigate(["/play",id]);

  }
}
