import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from "@angular/material/button";
import {MatTableModule} from "@angular/material/table";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSortModule} from "@angular/material/sort";
import {MatFormFieldModule, MatLabel} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from '@angular/material/icon';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatCardModule} from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatTabsModule} from '@angular/material/tabs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import {MatCheckboxModule} from "@angular/material/checkbox";
import {JsonPipe} from '@angular/common';
import {FormGroup, Validators, FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatOptionModule} from "@angular/material/core";
import {Component} from '@angular/core';
import {MatMenuModule} from '@angular/material/menu';
import {MatChipsModule} from '@angular/material/chips';
import {MatBadgeModule} from '@angular/material/badge';
import {MatRadioModule} from '@angular/material/radio';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatTreeModule, MatTreeNestedDataSource} from "@angular/material/tree";
import {MatDialog, MatDialogModule} from "@angular/material/dialog";


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    MatSliderModule,
    MatTabsModule,
    MatOptionModule,
    MatToolbarModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatGridListModule,
    MatCardModule,
    MatDialogModule,
    MatListModule,
    MatDatepickerModule,
    MatNativeDateModule,
    JsonPipe,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatMenuModule,
    MatChipsModule,
    MatTreeModule,
    MatDialogModule,
    MatBadgeModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSnackBarModule
  ],
  exports: [
    MatToolbarModule,
    MatTabsModule,
    MatSnackBarModule,
    MatSliderModule,
    MatPaginator,
    MatOptionModule,
    MatDialogModule,
    MatSort,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatLabel,
    MatDialogModule,
    MatIconModule,
    MatGridListModule,
    MatCardModule,
    MatListModule,
    MatDatepickerModule,
    MatNativeDateModule,
    JsonPipe,
    FormsModule,
    MatTreeModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatMenuModule,
    MatChipsModule,
    MatBadgeModule,
    MatCheckboxModule,
    MatRadioModule

  ]
})
export class MaterialModule {
}
