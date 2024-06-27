import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormRecord, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { signUp, signIn, confirmSignIn, confirmSignUp } from 'aws-amplify/auth';
import { AuthService } from '../auth.service';

export const passwordConfrimedValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('passwordConfirmation');

  return password && confirmPassword && password.value != confirmPassword.value
    ? { passwordConfirmed: false }
    : null;
};

@Component({
  selector: 'login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent {
  loginForm: FormGroup;
  signUpForm: FormGroup;
  verficationForm: FormGroup;
  changePasswordForm: FormGroup;

  isLoggedIn = false;
  needsVerification = false;
  needsPasswordChange = false;

  constructor(private formBuilder: FormBuilder, private authService: AuthService) {
    this.loginForm = new FormGroup(
      {
        email: new FormControl('', [Validators.required]),
        password: new FormControl('', [Validators.required]),
      }
    );

    this.signUpForm = new FormGroup({
        email: new FormControl('', [Validators.required]),
        password: new FormControl('', [Validators.required]),
        passwordConfirmation: new FormControl('', [Validators.required]),
        givenName: new FormControl('', [Validators.required]),
        familyName: new FormControl('', [Validators.required]),
      },
      {
        validators: passwordConfrimedValidator
      }
    );

    this.verficationForm = this.formBuilder.group({
      code: ['', Validators.required],
    });

    this.changePasswordForm = new FormGroup(
      {
        password: new FormControl('', [Validators.required]),
        passwordConfirmation: new FormControl('', [Validators.required]),
      },
      {
        validators: passwordConfrimedValidator
      }
    );
  }

  async onLogin() {
    if (!this.loginForm.valid) {
      return;
    }
    const { email, password } = this.loginForm.value;
    try {
      const {nextStep} = await this.authService.login(email, password);
      if (nextStep.signInStep == "CONFIRM_SIGN_UP") {
        this.signUpForm.value.email = email;
        this.needsVerification = true;
        this.isLoggedIn = true;
      } else if (nextStep.signInStep == "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        this.signUpForm.value.email = email;
        this.needsPasswordChange = true;
        this.isLoggedIn = true;
      }
    } catch (error) {
      console.error('Error signing in:', error);
    }
  }

  async onSignup() {
    if (!this.signUpForm.valid) {
      return;
    }
    const { email, password, givenName, familyName } =
      this.signUpForm.value;
    try {
      this.needsVerification = !(await this.authService.signUp(email, password, familyName, givenName));
      this.isLoggedIn = true;
    } catch (error) {
      console.log('Error', error);
    }
  }

  async onVerify() {
    if (!this.verficationForm.valid) {
      return;
    }
    const { code } = this.verficationForm.value;
    try {
      const {isSignUpComplete, nextStep} = await this.authService.confirmSignUp(this.signUpForm.value.email, code);
      this.needsPasswordChange = !isSignUpComplete;
      this.authService.login(this.loginForm.value.email, this.loginForm.value.password);
    } catch (error) {
      console.error('Error verifying email:', error);
    }
  }

  async onChangePassword() {
    if (!this.changePasswordForm.valid) {
      return;
    }
    const { password, passwordConfirmation } = this.changePasswordForm.value;
    try {
      await (this.authService.changePassword(password));
    } catch (error) {
      console.error('Error changing password:', error);
    }
  }
}
