import { Injectable } from '@angular/core';
import { from, lastValueFrom } from 'rxjs';
import { signInWithRedirect, fetchAuthSession, fetchUserAttributes, signOut } from 'aws-amplify/auth';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    async refreshLogin() {
        const session = (await fetchAuthSession());
        if (!session.tokens) {
            this.login();
        }
    }

    signOut() {
        signOut();
    }

    async getIdToken() {
        const { idToken } = (await fetchAuthSession()).tokens ?? {}
        return idToken?.toString();
    }

    login() {
        signInWithRedirect();
    }

    async isAdmin() {
        const user = await fetchUserAttributes();
        return user['custom:isAdmin'] && user['custom:isAdmin'] === 'true'
    }
}