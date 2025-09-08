import { Component, OnInit } from '@angular/core';

import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  NonNullableFormBuilder,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

function matchValidator(a: string, b: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const av = group.get(a)?.value;
    const bv = group.get(b)?.value;
    return av && bv && av !== bv ? { mismatch: true } : null;
  };
}

type ProfileFormModel = {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  mobilePhone: FormControl<string>;
  address: FormControl<string>;
  city: FormControl<string>;
  postalCode: FormControl<string>;
};
type UsernameFormModel = { username: FormControl<string> };
type PasswordFormModel = {
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmNewPassword: FormControl<string>;
};

type ProfileDTO = {
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
  address: string;
  city: string;
  postalCode: string;
};

@Component({
  selector: 'app-account.component',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  profileForm: FormGroup<ProfileFormModel>;
  usernameForm: FormGroup<UsernameFormModel>;
  passwordForm: FormGroup<PasswordFormModel>;

  loadingProfile = false;
  savingProfile = false;
  savingUsername = false;
  savingPassword = false;

  profileMessage = '';
  usernameMessage = '';
  passwordMessage = '';

  constructor(private fb: NonNullableFormBuilder, private title: Title, private http: HttpClient) {
    this.profileForm = this.fb.group({
      firstName: this.fb.control(''),
      lastName: this.fb.control(''),
      email: this.fb.control('', { validators: [Validators.email] }),
      mobilePhone: this.fb.control(''),
      address: this.fb.control(''),
      city: this.fb.control(''),
      postalCode: this.fb.control(''),
    });

    this.usernameForm = this.fb.group({
      username: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
      }),
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: this.fb.control('', { validators: [Validators.required] }),
        newPassword: this.fb.control('', {
          validators: [Validators.required, Validators.minLength(6)],
        }),
        confirmNewPassword: this.fb.control('', { validators: [Validators.required] }),
      },
      { validators: matchValidator('newPassword', 'confirmNewPassword') }
    );
  }

  ngOnInit(): void {
    this.title.setTitle('Account');
    this.loadData();
  }

  private loadData() {
    this.loadingProfile = true;

    this.http.get<ProfileDTO>('/api/profile', { withCredentials: true }).subscribe({
      next: (p) => {
        if (p) {
          this.profileForm.patchValue({
            firstName: p.firstName ?? '',
            lastName: p.lastName ?? '',
            email: p.email ?? '',
            mobilePhone: p.mobilePhone ?? '',
            address: p.address ?? '',
            city: p.city ?? '',
            postalCode: p.postalCode ?? '',
          });
        }
      },
      complete: () => (this.loadingProfile = false),
    });

    this.http
      .get<{ user: { username: string } | null }>('/api/auth/me', { withCredentials: true })
      .subscribe((res) => {
        if (res?.user?.username) {
          this.usernameForm.patchValue({ username: res.user.username });
        }
      });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.profileMessage = '';
    this.savingProfile = true;

    this.http
      .put('/api/profile', this.profileForm.getRawValue(), { withCredentials: true })
      .subscribe({
        next: () => (this.profileMessage = 'Profil sparad ✅'),
        error: (err) => (this.profileMessage = err?.error?.error || 'Kunde inte spara profil'),
        complete: () => (this.savingProfile = false),
      });
  }

  updateUsername() {
    if (this.usernameForm.invalid) {
      this.usernameForm.markAllAsTouched();
      return;
    }
    this.usernameMessage = '';
    this.savingUsername = true;

    this.http
      .put<{ username?: string }>('/api/account/username', this.usernameForm.getRawValue(), {
        withCredentials: true,
      })
      .subscribe({
        next: (resp) => {
          this.usernameMessage = 'Användarnamn uppdaterat ✅';
          if (resp?.username) {
            this.usernameForm.patchValue({ username: resp.username });
          }
        },
        error: (err) =>
          (this.usernameMessage = err?.error?.error || 'Kunde inte uppdatera användarnamn'),
        complete: () => (this.savingUsername = false),
      });
  }

  updatePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordMessage = '';
    this.savingPassword = true;

    const payload = {
      currentPassword: this.passwordForm.controls.currentPassword.value,
      newPassword: this.passwordForm.controls.newPassword.value,
    };

    this.http.put('/api/account/password', payload, { withCredentials: true }).subscribe({
      next: () => {
        this.passwordMessage = 'Lösenord uppdaterat ✅';
        this.passwordForm.reset();
      },
      error: (err) => (this.passwordMessage = err?.error?.error || 'Kunde inte uppdatera lösenord'),
      complete: () => (this.savingPassword = false),
    });
  }

  get pf() {
    return this.profileForm.controls;
  }
  get uf() {
    return this.usernameForm.controls;
  }
  get pwf() {
    return this.passwordForm.controls;
  }
}
