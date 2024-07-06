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
    let name= this.searchForm.value.movieName as string;
    let actors= this.searchForm.value.actors as string;
    let director= this.searchForm.value.director as string;
    let genres= this.searchForm.value.genres as string;

    if(name!="" && actors!="" && director!="" && genres!=""){  //ako je sve uneo saljemo query
      const actorsList=actors.split(',').sort()
      actors=actorsList.join(',')

      const genresList=genres.split(',').sort()
      genres=genresList.join(',')

      const query=name+","+actors+","+director+","+genres

      this.service.search(query).subscribe(value => {
        this.movies=value;
        console.log(this.movies);
        this.service.setMovies(this.movies)

      },error => {
        console.log("SEARCH ERROR");
      })
    }else{ //scan sa params
      if(actors){
        const actorsList=actors.split(',').sort()
        actors=actorsList.join(',')
      }if(genres){
        const genresList=genres.split(',').sort()
        genres=genresList.join(',')
      }
      this.service.getAllScan(name,actors,genres,director).subscribe(value => {
        this.movies=value;
        console.log(this.movies);
        this.service.setMovies(this.movies)

      },error => {
        console.log("SEARCH ERROR");
      })
    }
  }
}
