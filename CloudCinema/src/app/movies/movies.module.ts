import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieCardComponent } from './movie-card/movie-card.component';
import {MatIconModule} from "@angular/material/icon";



@NgModule({
  declarations: [
    MovieCardComponent
  ],
  exports: [
    MovieCardComponent
  ],
  imports: [
    CommonModule,
    MatIconModule
  ]
})
export class MoviesModule { }
