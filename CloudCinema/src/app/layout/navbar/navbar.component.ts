import {Component, OnInit} from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MovieService} from "../../movies/movie.service";
import {MovieInfo} from "../../movies/models/models.module";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit{
  genres: string[] = [
    "Action",
    "Comedy",
    "Horror",
    "Romance"
  ];
  searchForm: FormGroup;
  movies:MovieInfo[];



  constructor(private authService: AuthService,private service: MovieService,
              private fb: FormBuilder) {
  }
  ngOnInit(): void {
    this.searchForm = this.fb.group({
      movieName: [''],
      actors: [''],
      genres:[''],
      director:['']
    });
    }

  signOut() {
    this.authService.signOut();
  }

  search() {
    const name= this.searchForm.value.movieName as string;
    const actors= this.searchForm.value.actors as string;
    const director= this.searchForm.value.director as string;
    const genres= this.searchForm.value.genres as string;

    const query=name+","+actors+","+director+","+genres

    if(name=="" && actors=="" && director=="" && genres==""){
      this.service.getAll().subscribe(value => {
        this.movies=value;
        console.log(this.movies);
        this.service.setMovies(this.movies)

      },error => {
        console.log("SEARCH ERROR");
      })
    }else {
      this.service.search(query).subscribe(value => {
        this.movies=value;
        console.log(this.movies);
        this.service.setMovies(this.movies)

      },error => {
        console.log("SEARCH ERROR");
      })
    }
  }
}
