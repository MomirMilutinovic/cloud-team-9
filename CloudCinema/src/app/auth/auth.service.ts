import { Injectable } from '@angular/core';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { from, lastValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    signOut() {
        signOut();
    }

    async isAdmin() {
        const user = await fetchUserAttributes();
        return user['custom:isAdmin'] && user['custom:isAdmin'] === 'true'
    }
}