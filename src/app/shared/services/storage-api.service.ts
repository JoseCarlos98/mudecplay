import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PresignResponse } from '../interfaces/general-interfaces';

@Injectable({ providedIn: 'root' })
export class StorageApiService {
  private readonly apiBase = `${environment.apiUrl}/storage`;

  constructor(private readonly http: HttpClient) {}

  // =========================================================
  // Employees
  // =========================================================
  getEmployeePhotoUploadUrl(
    employeeId: number,
    file: File,
  ): Observable<PresignResponse> {
    return this.http.post<PresignResponse>(
      `${this.apiBase}/employees/${employeeId}/photo/upload-url`,
      {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
      },
    );
  }

  // =========================================================
  // Upload directo a S3
  // =========================================================
  // uploadToS3(
  //   uploadUrl: string,
  //   fileOrBlob: Blob,
  //   contentType?: string,
  // ): Observable<void> {
  //   const ct =
  //     contentType || (fileOrBlob as File)?.type || 'application/octet-stream';

  //   const headers = new HttpHeaders({
  //     'Content-Type': ct,
  //   });

  //   return this.http
  //     .put(uploadUrl, fileOrBlob, {
  //       headers,
  //       withCredentials: false,
  //       responseType: 'text' as 'json',
  //     })
  //     .pipe(map(() => void 0));
  // }

  uploadToS3(
  uploadUrl: string,
  fileOrBlob: Blob,
  contentType?: string,
): Observable<void> {
  const ct =
    contentType || (fileOrBlob as File)?.type || 'application/octet-stream';

  const headers = new HttpHeaders({
    'Content-Type': ct,
  });

  return this.http
    .put(uploadUrl, fileOrBlob, {
      headers,
      withCredentials: false,
      responseType: 'text' as 'json',
    })
    .pipe(map(() => void 0));
}
}