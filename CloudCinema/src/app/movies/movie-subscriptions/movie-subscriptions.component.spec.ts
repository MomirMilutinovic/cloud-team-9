import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MovieSubscriptionsComponent } from './movie-subscriptions.component';

describe('MovieSubscriptionsComponent', () => {
  let component: MovieSubscriptionsComponent;
  let fixture: ComponentFixture<MovieSubscriptionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MovieSubscriptionsComponent]
    });
    fixture = TestBed.createComponent(MovieSubscriptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
