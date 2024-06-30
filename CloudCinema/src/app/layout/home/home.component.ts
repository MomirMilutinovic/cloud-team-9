import {Component, OnInit} from '@angular/core';
import {MovieInfo} from "../../movies/models/models.module";
import {SubscriptionInfo} from "../../movies/models/models.module";
import {getDownlevelDecoratorsTransform} from "@angular/compiler-cli/src/transformers/downlevel_decorators_transform";
import {MovieService} from "../../movies/movie.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit{
  movies: MovieInfo[] = [];
  constructor(private movieService:MovieService) {}

  ngOnInit(): void {
    this.movieService.getAll().subscribe(value => {
      this.movies=value;
    },error => {
      console.error('Error fetching movies:', error);
    });
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
