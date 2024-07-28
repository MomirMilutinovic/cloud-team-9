import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeriesCardComponent } from './series-card.component';

describe('SeriesCardComponent', () => {
  let component: SeriesCardComponent;
  let fixture: ComponentFixture<SeriesCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SeriesCardComponent]
    });
    fixture = TestBed.createComponent(SeriesCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
