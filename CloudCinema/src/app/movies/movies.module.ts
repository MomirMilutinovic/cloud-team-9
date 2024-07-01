import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieCardComponent } from './movie-card/movie-card.component';
import {MatIconModule} from "@angular/material/icon";
import { EditMovieComponent } from './edit-movie/edit-movie.component';
import {ReactiveFormsModule} from "@angular/forms";
import {RouterLink} from "@angular/router";
import { PlayerComponent } from './player/player.component';
import { MovieSubscriptionsComponent } from './movie-subscriptions/movie-subscriptions.component';
import {MatTableModule} from "@angular/material/table";
import {MatButtonModule} from "@angular/material/button";



@NgModule({
  declarations: [
    MovieCardComponent,
    EditMovieComponent,
    PlayerComponent,
    MovieSubscriptionsComponent
  ],
  exports: [
    MovieCardComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatButtonModule
  ]
})
export class MoviesModule { }
