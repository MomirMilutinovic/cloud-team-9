import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/env/env';
import videojs from 'video.js';
import Player from "video.js/dist/types/player";

declare var require: any;
require('videojs-contrib-quality-levels');
require('videojs-hls-quality-selector');

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.css']
})
export class PlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  public player: Player;
  
  url = environment.transcodedMovieBucketUrl;

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const movieId = params.get('id');
      this.url += movieId + '.m3u8';
    });
  }

  ngAfterViewInit() {
    const options = {
      'sources': [{
        'src': this.url,
        'type': 'application/x-mpegURL'
      }
      ],
      // 'poster' : this.urlPoster
    };
    this.player = videojs('my-video', options, function onPlayerReady(this: any) {
      console.log('Player ready');
      var myPlayer = this, id = myPlayer.id();
      myPlayer.hlsQualitySelector();
    });
    this.player.fill(true);

  }

  ngOnDestroy(): void {
    if (this.player != null) {
      this.player.dispose();
    }
  }
}
