import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar.component';
import {MaterialModule} from "../infrastructure/material/material.module";
import { HomeComponent } from './home/home.component';



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
    MaterialModule
  ]
})
export class LayoutModule { }
