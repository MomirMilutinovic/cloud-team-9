import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {MovieInfo, SubscriptionInfo,Subscription} from "../models/models.module";
import {MovieService} from "../movie.service";
import {SubscriptionsService} from "./subscriptions.service";
import {HttpResponse} from "@angular/common/http";
import {MatTableDataSource} from "@angular/material/table";


@Component({
  selector: 'app-movie-subscriptions',
  templateUrl: './movie-subscriptions.component.html',
  styleUrls: ['./movie-subscriptions.component.css']
})
export class MovieSubscriptionsComponent implements OnInit{

  subscribeForm: FormGroup;
  dataSource = new MatTableDataSource<Subscription>([]);
  displayedColumns: string[] = ['type', 'subscription', 'delete'];

  constructor(private fb:FormBuilder,private movieService:MovieService,private subService:SubscriptionsService) {
  }

  ngOnInit(): void {
    this.subscribeForm = this.fb.group({
      actors: [''],
      directors: [''],
      genres: ['']
    });
    this.getAll()

  }

  subscribeSNS() {
    let genres: string[] = [];
    let actors: string[] = [];
    let directors: string[] = [];
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
    if (this.subscribeForm.value.directors.trim()!=""){
      directors = this.subscribeForm.value.directors.trim()
        .split(',')
        .map((director: string) => director.trim())
        .filter((director: string) => director !== '');
    }
    //@ts-ignore
    const email=localStorage.getItem("userEmail").toString() || '';


    const subscription: SubscriptionInfo = {
      email: email,
      directors: directors,
      genres: genres,
      actors: actors,
    };

    this.subService.subscribeSNS(subscription).subscribe(value => {
      console.log("Successful subscription!")
    },error => {
      console.log("Error during subscription!")
    });
  }

  getAll() {
    //@ts-ignore
    const email=localStorage.getItem("userEmail").toString() || '';
    this.subService.getAll(email).subscribe({next: (data: Subscription[]) => {
      this.dataSource.data = data;
    },error: (_) => {
        console.log("Error fetching data");
      }
    });
  }

  // delete() {
  //   // @ts-ignore
  //   const email=localStorage.getItem("userEmail").toString() || '';
  //
  //   this.subService.delete(email,"Actor-Glumac1").subscribe(
  //     (response: HttpResponse<any>) => {
  //       console.log("SUCCESS!")
  //     },
  //     error => {
  //       console.error('Error:', error);
  //     }
  //   );
  // }
  deleteSub(sub:Subscription) {
    let deleteSub=""
    if(sub.type=="Director"){
      deleteSub="Director-"+sub.subscription;
    }else if(sub.type=="Actor"){
      deleteSub="Actor-"+sub.subscription;
    }else if(sub.type=="Genre"){
      deleteSub="Genre-"+sub.subscription;
    }
    // @ts-ignore
    const email=localStorage.getItem("userEmail").toString() || '';
    this.subService.delete(email,deleteSub).subscribe(
      (response: HttpResponse<any>) => {
        console.log("SUCCESS!")
        this.getAll()
      },
      error => {
        console.error('Error:', error);
      }
    );

  }
}
