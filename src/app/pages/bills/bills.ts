import { Component } from '@angular/core';
import { ModuleHeader } from "../../shared/module-header/module-header";
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-bills',
  imports: [ModuleHeader, FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './bills.html',
  styleUrl: './bills.scss',
})
export class Bills {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
}
