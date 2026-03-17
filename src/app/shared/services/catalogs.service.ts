import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Catalog } from '../interfaces/general-interfaces';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  private apiUrl = `${environment.apiUrl}`;
  private readonly http = inject(HttpClient);

  suppliersCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/suppliers/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
  }

  productsCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/products/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
  }

  projectsCatalog(
    searchTerm: string = '',
    extraParams?: Record<string, any>,
  ): Observable<Catalog[]> {
    const url = `${this.apiUrl}/projects/catalog`;
    let params = new HttpParams();

    // search (como ya lo tienes)
    if (searchTerm?.trim()) {
      params = params.set('search', searchTerm.trim());
    }

    // extras (ej: { statusProject: 'open' })
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value.trim() === '') continue;

        // arrays -> key=1&key=2...
        if (Array.isArray(value)) {
          for (const v of value) {
            if (v === undefined || v === null) continue;
            params = params.append(key, String(v));
          }
        } else {
          params = params.set(key, String(value));
        }
      }
    }

    return this.http.get<Catalog[]>(url, { params });
  }

  responsibleCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/responsibles/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
  }

  clientsCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/clients/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
  }

  statusExpenseCatalog(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>(`${this.apiUrl}/status-expense/catalog`);
  }

  areasSuppliersCatalog(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>(`${this.apiUrl}/areas/catalog`);
  }

  rolesCatalog(): Observable<Catalog[]> {
    return this.http.get<Catalog[]>(`${this.apiUrl}/roles/catalog`);
  }

}
