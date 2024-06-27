import { Injectable } from '@angular/core';
import { from, lastValueFrom } from 'rxjs';
import { signIn, signInWithRedirect, fetchAuthSession, fetchUserAttributes, signOut, signUp, confirmSignUp, confirmSignIn, autoSignIn } from 'aws-amplify/auth';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(private router: Router) {

    }

    async refreshLogin() {
        const session = (await fetchAuthSession());
        if (!session.tokens) {
            this.router.navigate(['/login']);
        }
    }

    signOut() {
        signOut();
        this.router.navigate(['/login']);
    }

    async getIdToken() {
        const { idToken } = (await fetchAuthSession()).tokens ?? {}
        return idToken?.toString();
    }

    async login(email: string, password: string) {
        const {nextStep} = await signIn({
            username: email,
            password: password,
        });
        if (nextStep.signInStep == "DONE") {
            this.router.navigate(['/home']);
        }

        return {nextStep};
    }

    async isAdmin() {
        const user = await fetchUserAttributes();
        return user['custom:isAdmin'] && user['custom:isAdmin'] === 'true'
    }

    async signUp(email: string, password: string, familyName: string, givenName: string) {
        const { isSignUpComplete, userId, nextStep } = await signUp({
            username: email,
            password,
            options: {
                userAttributes: {
                    family_name: familyName,
                    given_name: givenName,
                    email: email
                },
                autoSignIn: true
            }
        });
        return isSignUpComplete;
    }

    async confirmSignUp(email: string, confirmationCode: string) {
        const {isSignUpComplete, nextStep} = (await confirmSignUp({username: email, confirmationCode }));
        console.log("Next step", nextStep);
        if (nextStep.signUpStep == "COMPLETE_AUTO_SIGN_IN") {
            await autoSignIn();
            this.router.navigate(['/home']);
        }

        return {isSignUpComplete, nextStep};
    }

    async changePassword(newPassword: string) {
        const {nextStep, isSignedIn} = await confirmSignIn({
            challengeResponse: newPassword,
        });
        if (isSignedIn) {
            this.router.navigate(['/home']);
        }
    }
}