import { Injectable } from '@angular/core';

export type WorkstationPrinterCode =
  | 'JEFE_OFICINA'
  | 'JEFE_OFICINA_2';

@Injectable({
  providedIn: 'root',
})
export class WorkstationPrinterService {
  private readonly storageKey =
    'mudecplay_printer_code';

  private readonly defaultPrinterCode:
    WorkstationPrinterCode =
      'JEFE_OFICINA';

  getPrinterCode(): WorkstationPrinterCode {
    const storedCode = String(
      localStorage.getItem(
        this.storageKey,
      ) ?? '',
    )
      .trim()
      .toUpperCase();

    if (
      storedCode ===
      'JEFE_OFICINA_2'
    ) {
      return 'JEFE_OFICINA_2';
    }

    return this.defaultPrinterCode;
  }

  setPrinterCode(
    printerCode:
      WorkstationPrinterCode,
  ): void {
    localStorage.setItem(
      this.storageKey,
      printerCode,
    );
  }

  hasConfiguredPrinter(): boolean {
    return Boolean(
      localStorage.getItem(
        this.storageKey,
      ),
    );
  }
}