import { PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import * as entity from '../interfaces/expense-interfaces';

export class ExpenseMapper {
    static mapToExpenseList(response: PaginatedResponse<entity.ExpenseResponseDto>): PaginatedResponse<entity.ExpenseResponseDtoMapper> {
        const data = response.data.map((item) => {
            const originData = item;
            const amount = item.amount.toString();
            const supplier = item.supplier ? item.supplier.company_name : 'No asignado';
            const project = item.project ? item.project.name : 'No asignado';

            const mapped: entity.ExpenseResponseDtoMapper = {
                ...item,
                originData,
                concept: item.concept,
                date: item.date,
                amount,
                supplier,
                project,
            };

            return mapped;
        });

        return {
            ...response,
            data
        };
    }
}