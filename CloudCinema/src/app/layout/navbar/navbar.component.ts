import { Component } from '@angular/core';
import { signOut } from 'aws-amplify/auth';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  genres: string[] = [
    "Action",
    "Comedy",
    "Horror",
    "Romance"
  ];

  signOut() {
    signOut();
  }

}
