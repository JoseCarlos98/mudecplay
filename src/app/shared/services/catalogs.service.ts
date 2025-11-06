import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Catalog } from '../interfaces/general-interfaces';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private apiUrl = `${environment.apiUrl}`;
  private readonly http = inject(HttpClient);

  supplierCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/suppliers/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
  }
  
  projectsCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/projects/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
  }
}
