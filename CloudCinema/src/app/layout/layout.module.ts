import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import {MaterialModule} from "../infrastructure/material/material.module";
import { HomeComponent } from './home/home.component';
import {MoviesModule} from "../movies/movies.module";
import {RouterLink} from "@angular/router";



@NgModule({
  declarations: [
    NavbarComponent,
    HomeComponent
  ],
  exports: [
    NavbarComponent
  ],
    imports: [
        CommonModule,
        MoviesModule,
        MaterialModule,
        RouterLink
    ]
})
export class LayoutModule { }
