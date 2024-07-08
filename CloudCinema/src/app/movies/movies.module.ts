import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieCardComponent } from './movie-card/movie-card.component';
import {MatIconModule} from "@angular/material/icon";
import { EditMovieComponent } from './edit-movie/edit-movie.component';
import {ReactiveFormsModule} from "@angular/forms";
import {RouterLink} from "@angular/router";
import { PlayerComponent } from './player/player.component';
import { MovieInfoComponent } from './movie-info/movie-info.component';
import { MovieSubscriptionsComponent } from './movie-subscriptions/movie-subscriptions.component';
import {MatTableModule} from "@angular/material/table";
import {MatButtonModule} from "@angular/material/button";
import {SeriesModule} from "../series/series.module";
import {MaterialModule} from "../infrastructure/material/material.module";
import { CreateMovieComponent } from './create-movie/create-movie.component';
import { DownloadDialogComponent } from './download-dialog/download-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';



@NgModule({
  declarations: [
    MovieCardComponent,
    EditMovieComponent,
    PlayerComponent,
    MovieInfoComponent,
    MovieSubscriptionsComponent,
    CreateMovieComponent,
    DownloadDialogComponent,
  ],
  exports: [
    MovieCardComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    RouterLink,
    MaterialModule
  ]
})
export class MoviesModule { }
