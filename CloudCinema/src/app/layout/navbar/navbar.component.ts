import { Component } from '@angular/core';
import { signOut } from 'aws-amplify/auth';
import { AuthService } from 'src/app/auth/auth.service';

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

  constructor(private authService: AuthService) {

  }
  signOut() {
    this.authService.signOut();
  }

}
