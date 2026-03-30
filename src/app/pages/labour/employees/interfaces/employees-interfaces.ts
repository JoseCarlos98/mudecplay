
type EmployeeStatus = 'active' | 'inactive' | 'reentry';

interface CatalogOption {
  id: string;
  name: string;
}

interface EmployeeRow {
  id: number;
  full_name: string;
  curp: string;
  area: string;
  area_label: string;
  position: string;
  age: number;
  entry_date: string;
  weekly_salary: number;
  employment_status: EmployeeStatus;
  employment_status_label: string;
  birth_date: string;
  address: string;
  discharge_date: string | null;
  reentry_date: string | null;
}

interface EmployeesFilters {
  page: number;
  limit: number;
  fullName: string | null;
  curp: string | null;
  area: string | null;
  employmentStatus: EmployeeStatus | null;
}

interface EmployeesTableData {
  data: EmployeeRow[];
  meta: {
    total: number;
  };
}