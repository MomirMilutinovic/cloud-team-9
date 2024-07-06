import { Component, Input } from '@angular/core';
import {Observable, range, toArray} from "rxjs";
import { MovieService } from '../movie.service';
import {MovieInfo, RatingInfo, WatchInfo} from '../models/models.module';
import {ActivatedRoute, Router} from '@angular/router';
import {HttpResponse} from "@angular/common/http";
import {MimetypesKind} from "video.js/dist/types/utils/mimetypes";
import mov = MimetypesKind.mov;

@Component({
  selector: 'app-movie-info',
  templateUrl: './movie-info.component.html',
  styleUrls: ['./movie-info.component.css']
})
export class MovieInfoComponent {
  movieId:string
  timestamp:number
  movie:MovieInfo

  protected readonly Array = Array;


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
    this.maxRatingArrDirector = Array(this.maxRatingDirector).fill(0);

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

  SendRate() {
    const userEmail = localStorage.getItem('userEmail') || ""
    let rate = this.SelectedStarDirector;
    if (rate>0) {
      const ratingInfo : RatingInfo = {
        email: userEmail,
        rate: rate,
        genres:this.movie.genres,
        actors:this.movie.actors
      }

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
    }else{
      //poruka selektuj zvezdice
    }
  }

  Play(movie:MovieInfo) {

    const userEmail = localStorage.getItem('userEmail') || ""
    const info: WatchInfo = {
      email: userEmail,
      genres: movie.genres,
      actors: movie.actors
    }
    this.service.updateWatchHistory(info).subscribe(
      (response: HttpResponse<any>) => {
        console.log("SUCCESS!")
      },
      error => {
        console.error('Error:', error);
      }
    );

    this.router.navigate(["/play",movie.id]);

  }
}
