import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface TicketProjectOption {
  id: number;
  name: string;
}

interface TicketFilePreview {
  name: string;
  sizeLabel: string;
  typeLabel: string;
  previewUrl: string | null;
}

@Component({
  selector: 'app-uploa-ticket',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './uploa-ticket.html',
  styleUrl: './uploa-ticket.scss',
})
export class UploaTicket {
  private readonly fb = new FormBuilder();

  readonly form = this.fb.group({
    project_id: [null as number | null, Validators.required],
    project_search: ['', Validators.required],
  });

  readonly projects: TicketProjectOption[] = [
    { id: 15, name: 'Expansión isla' },
    { id: 8, name: 'Urban Hub' },
    { id: 11, name: 'Edificio Magda' },
    { id: 22, name: 'Casa modelo norte' },
  ];

  filteredProjects: TicketProjectOption[] = [...this.projects];

  selectedFile: File | null = null;
  filePreview: TicketFilePreview | null = null;

  showProjectOptions = false;
  isDragging = false;
  saving = false;

  get canSave(): boolean {
    return this.form.valid && !!this.selectedFile && !this.saving;
  }

  onProjectFocus(): void {
    this.showProjectOptions = true;
    this.filterProjects();
  }

  onProjectSearch(): void {
    this.form.patchValue({ project_id: null }, { emitEvent: false });
    this.showProjectOptions = true;
    this.filterProjects();
  }

  selectProject(project: TicketProjectOption): void {
    this.form.patchValue({
      project_id: project.id,
      project_search: project.name,
    });

    this.showProjectOptions = false;
  }

  private filterProjects(): void {
    const search = this.form.controls.project_search.value?.trim().toLowerCase() ?? '';

    this.filteredProjects = this.projects.filter((project) =>
      project.name.toLowerCase().includes(search),
    );
  }

  onBlurProject(): void {
    setTimeout(() => {
      this.showProjectOptions = false;
    }, 180);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.setFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.setFile(file);
    }

    input.value = '';
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
  }

  cancel(): void {
    this.form.reset({
      project_id: null,
      project_search: '',
    });

    this.removeFile();
  }

  save(): void {
    if (!this.canSave) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    setTimeout(() => {
      this.saving = false;
      console.log('Ticket listo para subir:', {
        project_id: this.form.value.project_id,
        file: this.selectedFile,
      });
    }, 800);
  }

  private setFile(file: File): void {
    this.selectedFile = file;

    const isImage = file.type.startsWith('image/');

    this.filePreview = {
      name: file.name,
      sizeLabel: this.formatFileSize(file.size),
      typeLabel: this.getFileTypeLabel(file),
      previewUrl: null,
    };

    if (!isImage) return;

    const reader = new FileReader();

    reader.onload = () => {
      this.filePreview = {
        ...this.filePreview!,
        previewUrl: String(reader.result),
      };
    };

    reader.readAsDataURL(file);
  }

  private formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;

    const kb = size / 1024;

    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    return `${(kb / 1024).toFixed(1)} MB`;
  }

  private getFileTypeLabel(file: File): string {
    const extension = file.name.split('.').pop()?.toUpperCase();

    return extension || 'Archivo';
  }
}