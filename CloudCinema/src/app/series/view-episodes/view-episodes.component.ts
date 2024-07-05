import {Component, OnInit} from '@angular/core';
import {MovieInfo} from "../../movies/models/models.module";
import {MovieService} from "../../movies/movie.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-view-episodes',
  templateUrl: './view-episodes.component.html',
  styleUrls: ['./view-episodes.component.css']
})
export class ViewEpisodesComponent implements OnInit{
  episodes: MovieInfo[]=[];
  seriesName:string | null ='';

  constructor(private moviesService:MovieService,private route: ActivatedRoute) {

  }
  scrollLeft(): void {
    const container = document.querySelector('.movie-container') as HTMLElement;
    container.scrollBy({
      left: -300,
      behavior: 'smooth'
    });
  }

  scrollRight(): void {
    const container = document.querySelector('.movie-container') as HTMLElement;
    container.scrollBy({
      left: 300,
      behavior: 'smooth'
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.seriesName= params.get('seriesName');
      // @ts-ignore
      this.moviesService.getEpisodes(this.seriesName).subscribe(value => {
        this.episodes=value;
      })
    });

  }

}
