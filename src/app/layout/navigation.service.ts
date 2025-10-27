import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';



export interface Module {
  id: string;
  name: string;
  icon: string;
  route: string;
  description: string;
  subModules?: SubModule[];
}

export interface SubModule {
  id: string;
  name: string;
  icon: string;
  route: string;
  description: string;
  sections?: Section[];
}

export interface Section {
  id: string;
  name: string;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  icon: string;
  route: string;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private activeModuleSubject = new BehaviorSubject<Module | null>(null);
  activeModule$ = this.activeModuleSubject.asObservable();

  private modules: any[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      description: 'Vista general del sistema',
    },
    {
      id: 'finanzas',
      name: 'Finanzas',
      icon: 'account_balance',
      route: '/finanzas',
      description: 'Gestión financiera y contable',
      subModules: [
        {
          id: 'contabilidad',
          name: 'Contabilidad',
          icon: 'receipt_long',
          route: '/finanzas/contabilidad',
          description: 'Control financiero y registro de operaciones contables',
          sections: [
            {
              id: 'actualizaciones',
              name: 'ACTUALIZACIONES',
              items: [
                { id: 'plan-cuentas', name: 'Plan único de cuentas', icon: 'format_list_bulleted', route: '/contabilidad/actualizaciones/plan-cuentas' },
                { id: 'fuentes', name: 'Fuentes contables', icon: 'source', route: '/contabilidad/actualizaciones/fuentes' },
                { id: 'centros-costo', name: 'Centros de costo', icon: 'account_tree', route: '/contabilidad/actualizaciones/centros-costo' },
                { id: 'comprobantes', name: 'Comprobantes', icon: 'receipt', route: '/contabilidad/actualizaciones/comprobantes' }
              ]
            },
            {
              id: 'procesos',
              name: 'PROCESOS',
              items: [
                { id: 'auditoria', name: 'Auditoría de comprobantes', icon: 'checklist', route: '/contabilidad/procesos/auditoria' },
                { id: 'cierre', name: 'Cierre anual', icon: 'event_available', route: '/contabilidad/procesos/cierre' },
                { id: 'numeracion', name: 'Numeración de folios', icon: 'format_list_numbered', route: '/contabilidad/procesos/numeracion' },
                { id: 'nits', name: 'Cambiar NITs', icon: 'swap_horiz', route: '/contabilidad/procesos/nits' }
              ]
            },
            {
              id: 'consultas',
              name: 'CONSULTAS',
              items: [
                { id: 'comprobantes', name: 'Comprobantes', icon: 'receipt', route: '/contabilidad/consultas/comprobantes' },
                { id: 'terceros', name: 'Movimientos de terceros', icon: 'group', route: '/contabilidad/consultas/terceros' },
                { id: 'centros-costo', name: 'Movimientos de centros de costo', icon: 'account_tree', route: '/contabilidad/consultas/centros-costo' },
                { id: 'libros-auxiliares', name: 'Libros auxiliares', icon: 'book', route: '/contabilidad/consultas/libros-auxiliares' },
                { id: 'balance-prueba', name: 'Balance de prueba', icon: 'balance', route: '/contabilidad/consultas/balance-prueba' },
                { id: 'ivas-retenciones', name: 'Ivas y retenciones', icon: 'percent', route: '/contabilidad/consultas/ivas-retenciones' },
                { id: 'certificado-retencion', name: 'Certificado de retención', icon: 'verified', route: '/contabilidad/consultas/certificado-retencion' },
                { id: 'auxiliar-cuenta', name: 'Libro auxiliar por cuenta', icon: 'bookmarks', route: '/contabilidad/consultas/auxiliar-cuenta' }
              ]
            },
            {
              id: 'libros-oficiales',
              name: 'LIBROS OFICIALES',
              items: [
                { id: 'diario', name: 'Libro diario', icon: 'menu_book', route: '/contabilidad/libros-oficiales/diario' },
                { id: 'mayor', name: 'Libro mayor y balance', icon: 'library_books', route: '/contabilidad/libros-oficiales/mayor' },
                { id: 'inventario', name: 'Inventario y balance', icon: 'inventory_2', route: '/contabilidad/libros-oficiales/inventario' }
              ]
            },
            {
              id: 'libros-financieros',
              name: 'LIBROS FINANCIEROS',
              items: [
                { id: 'estado-resultados', name: 'Estado de resultados', icon: 'trending_up', route: '/contabilidad/libros-financieros/estado-resultados' },
                { id: 'balance-general', name: 'Balance general', icon: 'assessment', route: '/contabilidad/libros-financieros/balance-general' },
                { id: 'anexo-terceros', name: 'Anexo de terceros por cuenta', icon: 'people_alt', route: '/contabilidad/libros-financieros/anexo-terceros' },
                { id: 'balance-financieras', name: 'Balance de entidades financieras', icon: 'account_balance', route: '/contabilidad/libros-financieros/balance-financieras' },
                { id: 'balance-terceros', name: 'Balance de prueba con terceros', icon: 'compare', route: '/contabilidad/libros-financieros/balance-terceros' },
                { id: 'analisis-horizontal', name: 'Análisis Horizontal de Ingresos y Gastos', icon: 'show_chart', route: '/contabilidad/libros-financieros/analisis-horizontal' }
              ]
            },
            {
              id: 'libros-tributarios',
              name: 'LIBROS TRIBUTARIOS',
              items: [
                { id: 'informe-anual', name: 'Informe anual de retenciones practicadas', icon: 'description', route: '/contabilidad/libros-tributarios/informe-anual' },
                { id: 'iva-descontable', name: 'Informe bimestral del IVA descontable', icon: 'receipt_long', route: '/contabilidad/libros-tributarios/iva-descontable' },
                { id: 'retencion-iva', name: 'Informe bimestral de retención de IVA', icon: 'money_off', route: '/contabilidad/libros-tributarios/retencion-iva' }
              ]
            }
          ]
        },
        // ... otros submodulos de finanzas si los hay
      ]
    }
  ];

  getModules(): Module[] {
    return this.modules;
  }

  setActiveModule(moduleId: string | null): void {
    const module = moduleId ? this.modules.find(m => m.id === moduleId) : null;
    this.activeModuleSubject.next(module || null);
  }

  getModuleById(moduleId: string): Module | undefined {
    return this.modules.find(m => m.id === moduleId);
  }
}