import {Component, Input, OnInit} from '@angular/core';
import {MovieInfo} from "../../movies/models/models.module";
import {SubscriptionInfo} from "../../movies/models/models.module";
import {getDownlevelDecoratorsTransform} from "@angular/compiler-cli/src/transformers/downlevel_decorators_transform";
import {MovieService} from "../../movies/movie.service";
import {MimetypesKind} from "video.js/dist/types/utils/mimetypes";
import mov = MimetypesKind.mov;
import {MoviesModule} from "../../movies/movies.module";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit{
  movies: MovieInfo[] = [];
  allSeries: MovieInfo[] = [];
  constructor(private movieService:MovieService) {}

  ngOnInit(): void {
    this.movieService.getMovies().subscribe(movies => {
      this.separateContent(movies)
      // this.movies=this.getMovies(movies)
      // this.allSeries =this.getSeries(movies);
    });
    const email=localStorage.getItem('userEmail') || ''
    // @ts-ignore
    this.movieService.getAll(email).subscribe(value => {
      this.movieService.setMovies(value);
    },error => {
      console.error('Error fetching movies:', error);
    });
  }

  separateContent(contents: MovieInfo[]) {
    const allMovies = [];
    const allSeries = [];
    const names:string[]=[]
    for (const content of contents) {
      if (content.episode == "") {
        allMovies.push(content);
        // @ts-ignore
      }else if(!names.includes(content.name)){
        allSeries.push(content)
        // @ts-ignore
        names.push(content.name)
      }
    }
    this.allSeries = allSeries.slice(0, 10);
    this.movies = allMovies.slice(0, 10);

  }
  getMovies(movies: MovieInfo[]) {
    const allMovies = [];
    for (const movie of movies) {
      if (movie.episode == null) {
        allMovies.push(movie);
      }
    }
    return allMovies
  }
  getSeries(movies: MovieInfo[]) {
    const allSeries = [];
    const names:string[]=[]
    for (const movie of movies) {
      // @ts-ignore
      if (movie.episode != null && !names.includes(movie.name)) {
        allSeries.push(movie);
        // @ts-ignore
        names.push(movie.name)
      }
    }
    return allSeries;
  }

  scrollLeft(): void {
    const container = document.querySelector('.movie-container') as HTMLElement;
    container.scrollBy({
      left: -300,
      behavior: 'smooth'
    });
  }

  scrollRight(): void {
    const container = document.querySelector('.movie-container') as HTMLElement;
    container.scrollBy({
      left: 300,
      behavior: 'smooth'
    });
  }
  scrollLeftSeries(): void {
    const container = document.querySelector('.series-container') as HTMLElement;
    container.scrollBy({
      left: -300,
      behavior: 'smooth'
    });
  }

  scrollRightSeries(): void {
    const container = document.querySelector('.series-container') as HTMLElement;
    container.scrollBy({
      left: 300,
      behavior: 'smooth'
    });
  }
}
