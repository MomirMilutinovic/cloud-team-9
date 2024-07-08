import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MovieService } from '../movie.service';

@Component({
  selector: 'app-download-dialog',
  templateUrl: './download-dialog.component.html',
  styleUrls: ['./download-dialog.component.css']
})
export class DownloadDialogComponent implements OnInit {
  qualityForm: FormGroup;
  qualities: string[] = [];

  constructor(private fb: FormBuilder, 
    @Inject(MAT_DIALOG_DATA) protected data: {id: string},
    private movieService: MovieService,
    private dialogRef: MatDialogRef<DownloadDialogComponent>
  ) {
  }

  ngOnInit(): void {
    this.qualityForm = this.fb.group({
      quality: ['', Validators.required]
    });
    this.movieService.getQualities(this.data.id).subscribe(
      (response: any) => {
        this.qualities = response;
      }
    );
  }

  download() {
    this.movieService.downloadMovie(this.data.id, this.qualityForm.value.quality,
      () => this.dialogRef.close()
    );
  }
}
