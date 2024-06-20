import { Component } from '@angular/core';
import {MovieInfo} from "../../movies/models/models.module";
import {getDownlevelDecoratorsTransform} from "@angular/compiler-cli/src/transformers/downlevel_decorators_transform";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  movies: MovieInfo[] = [
    {
      title: 'Naziv Filma 1',
      description: 'Ovo je opis filma 1.',
      genres: ['Akcija']
    },
    {
      title: 'Naziv Filma 1',
      description: 'Ovo je opis filma 1.',
      genres: ['Akcija']
    },
    {
      title: 'Naziv Filma 1',
      description: 'Ovo je opis filma 1.',
      genres: ['Akcija']
    },
    {
      title: 'Naziv Filma 1',
      description: 'Ovo je opis filma 1.',
      genres: ['Akcija','nesto']
    }
  ];

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
