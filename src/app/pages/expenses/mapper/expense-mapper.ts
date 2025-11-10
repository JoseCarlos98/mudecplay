import { PaginatedResponse } from '../../../shared/interfaces/general-interfaces';
import * as entity from '../interfaces/expense-interfaces';

export class ExpenseMapper {
    // static mapToExpenseList(response: PaginatedResponse<entity.ExpenseResponseDto>) {
    // static mapToExpenseList(response: PaginatedResponse<entity.ExpenseResponseDto>): PaginatedResponse<entity.ExpenseResponseDtoMapper> {
        // const data = response.data.map((item) => {
        //     const supplier = item.supplier
        //         ? item.supplier.company_name
        //         : 'No asignado';

    //     //     const project = item.project
    //     //         ? item.project.name
    //     //         : 'No asignado';

    //     //     const mapped: entity.ExpenseResponseDtoMapper = {
    //     //         ...item,
    //     //         originData: item,     
    //     //         supplier,
    //     //         project,
    //     //         amount: item.amount,   
    //     //         date: item.date,       
    //     //     };


    //     // return {
    //     //     ...response,
    //     //     data : response.meta
    //     // };

    //     return response
    // }
}
