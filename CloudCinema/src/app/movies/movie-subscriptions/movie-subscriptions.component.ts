import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {MovieInfo, SubscriptionInfo} from "../models/models.module";
import {MovieService} from "../movie.service";

@Component({
  selector: 'app-movie-subscriptions',
  templateUrl: './movie-subscriptions.component.html',
  styleUrls: ['./movie-subscriptions.component.css']
})
export class MovieSubscriptionsComponent implements OnInit{

  subscribeForm: FormGroup;

  constructor(private fb:FormBuilder,private movieService:MovieService) {
  }

  ngOnInit(): void {
    this.subscribeForm = this.fb.group({
      actors: [''],
      director: [''],
      genres: ['']
    });
  }

  subscribeSNS() {
    let genres: string[] = [];
    let actors: string[] = [];
    if (this.subscribeForm.value.genres.trim()!=""){
      genres = this.subscribeForm.value.genres.trim()
        .split(',')
        .map((genre: string) => genre.trim())
        .filter((genre: string) => genre !== '');
    }
    if (this.subscribeForm.value.actors.trim()!=""){
      actors = this.subscribeForm.value.actors.trim()
        .split(',')
        .map((actor: string) => actor.trim())
        .filter((actor: string) => actor !== '');
    }
    //@ts-ignore
    const email=localStorage.getItem("userEmail").toString() || '';
    const director=this.subscribeForm.value.director.trim();


    const subscription: SubscriptionInfo = {
      email: email,
      director: director,
      genres: genres,
      actors: actors,
    };

    this.movieService.subscribeSNS(subscription).subscribe(value => {
      console.log("Successful subscription!")
    },error => {
      console.log("Error during subscription!")
    });
  }


}
