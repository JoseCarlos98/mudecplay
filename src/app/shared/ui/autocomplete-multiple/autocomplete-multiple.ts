import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Optional,
  Self,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import {
  Observable,
  of,
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { CatalogsService } from '../../services/catalogs.service';
import { Catalog } from '../../interfaces/general-interfaces';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-autocomplete-multiple',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatIcon,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './autocomplete-multiple.html',
  styleUrl: './autocomplete-multiple.scss',
    // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutocompleteMultiple  {

}
