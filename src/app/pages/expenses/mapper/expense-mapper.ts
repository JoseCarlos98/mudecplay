import { PaginatedResponse } from '../../../shared/general-interfaces/general-interfaces';
import * as entity from '../interfaces/expense-interfaces';
export class Mapper {
    static mapToExpenseList(response: PaginatedResponse<entity.ExpenseResponseDto>, formatsService?: any): PaginatedResponse<entity.ExpenseResponseDtoMapper> {
        let dataList: entity.ExpenseResponseDtoMapper[] = [];

        response.data.forEach((data: entity.ExpenseResponseDto): void => {
            dataList.push({
                ...data,
                originData: data,
                concept: data.concept,
                date: data.date,
                amount: data.amount.toString(),
                supplier: data.supplier.company_name,
                project: data.project.name,
                // amount: formatsService.moneyFormat(parseFloat(data.amount)),
                // monthFormatter: formatsService.getMonthName(parseFloat(data.month)),
            });
        });


        return {
            ...response,
            data: dataList
        }
    }
}