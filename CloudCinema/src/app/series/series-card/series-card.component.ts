import {Component, Input} from '@angular/core';
import {MovieInfo} from "../../movies/models/models.module";

@Component({
  selector: 'app-series-card',
  templateUrl: './series-card.component.html',
  styleUrls: ['./series-card.component.css']
})
export class SeriesCardComponent {

  @Input()
  series: MovieInfo;
}
