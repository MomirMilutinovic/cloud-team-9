import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeriesCardComponent } from './series-card/series-card.component';
import {MatIconModule} from "@angular/material/icon";
import { ViewEpisodesComponent } from './view-episodes/view-episodes.component';
import {MoviesModule} from "../movies/movies.module";
import {RouterLink} from "@angular/router";



@NgModule({
  declarations: [
    SeriesCardComponent,
    ViewEpisodesComponent
  ],
  imports: [
    CommonModule,
    MoviesModule,
    MatIconModule,
    RouterLink
  ],
  exports:[
    SeriesCardComponent
  ]
})
export class SeriesModule { }
