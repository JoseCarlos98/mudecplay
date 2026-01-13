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

  projectsCatalog(searchTerm: string = ''): Observable<Catalog[]> {
    const url = `${this.apiUrl}/projects/catalog`;
    let params = new HttpParams();

    if (searchTerm) params = params.set('search', searchTerm)

    return this.http.get<Catalog[]>(url, { params })
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
