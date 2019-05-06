import {Component, Input, OnInit} from '@angular/core';
import {Operation} from '../entity/operation';
import {NgbActiveModal, NgbDateParserFormatter, NgbDatepickerI18n, NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Client} from '../entity/client';
import {OperationType} from '../entity/operation-type';
import {ClientsManagerDateFormatter} from '../utils/formatter/clients-manager-date-formatter';
import {ClientsManagerDatepickerLocaleFormatter} from '../utils/formatter/clients-manager-datepicker-locale-formatter';
import {ClientsManagerTimeFormatter} from '../utils/formatter/clients-manager-time-formatter';
import {AsyncValidatorFn, FormControl} from '@angular/forms';
import {OperationValidator} from '../utils/validator/operation-validator';
import {isNumber} from 'util';
import {Observable} from 'rxjs';
import {from} from 'rxjs/internal/observable/from';
import {ClientEditComponent} from '../client-edit/client-edit.component';
import {ErrorService} from '../service/error.service';
import {CRUDService} from '../service/crud.service';

@Component({
    selector: 'rp-operation-edit',
    templateUrl: './operation-edit.component.html',
    styleUrls: ['./operation-edit.component.css'],
    providers: [
        {provide: NgbDateParserFormatter, useClass: ClientsManagerDateFormatter},
        {provide: NgbDatepickerI18n, useClass: ClientsManagerDatepickerLocaleFormatter}
    ]
})
export class OperationEditComponent implements OnInit {

    constructor(public activeModal: NgbActiveModal,
                private modalService: NgbModal,
                private dateFormatter: NgbDateParserFormatter,
                private timeFormatter: ClientsManagerTimeFormatter,
                private operationValidator: OperationValidator,
                private errorService: ErrorService,
                private crudService: CRUDService) {
    }

    @Input() operation: Operation;
    clients: Client[];
    operationTypes: OperationType[];
    operationTypeControl: FormControl;
    clientControl: FormControl;
    timeStartControl: FormControl;
    timeFinishControl: FormControl;
    timeStatus = true;
    dateTimeStatus = true;
    priceStatus = true;
    priceControl: FormControl;

    ngOnInit() {
        from(this.crudService.getAll(OperationType)).subscribe(types => {
            this.operationTypes = types;
        }, error => {
            this.errorService.showError('Error get all types', error);
        });

        from(this.crudService.getAll(Client)).subscribe(clients => {
            this.clients = clients;
        }, error => {
            this.errorService.showError('Error get all clients', error);
        });

        this.operationTypeControl = new FormControl(this.operation.operationType, [(control: FormControl) => {
            this.operation.operationType = control.value;
            return null;
        }]);

        this.clientControl = new FormControl(this.operation.client, [(control: FormControl) => {
            this.operation.client = control.value;
            return null;
        }]);

        this.timeStartControl = new FormControl(this.timeFormatter.formatTime(this.operation.startTime), [(control: FormControl) => {
                const startValue = control.value;
                if (!startValue) {
                    this.timeStatus = true;
                    return null;
                }
                this.operation.startTime = this.timeFormatter.formatString(startValue);

                if (this.operationValidator.validateStartAndFinishTimeValue(this.operation)) {
                    this.timeStatus = true;
                    return null;
                }

                this.timeStatus = false;
                return {
                    invalidRange: true
                };
            }],
            [this.dateTimeValidation()]);

        this.timeFinishControl = new FormControl(this.timeFormatter.formatTime(this.operation.finishTime), [(control: FormControl) => {
                const finishValue = control.value;
                if (!finishValue) {
                    this.timeStatus = true;
                    return null;
                }
                this.operation.finishTime = this.timeFormatter.formatString(finishValue);
                if (this.operationValidator.validateStartAndFinishTimeValue(this.operation)) {
                    this.timeStatus = true;
                    return null;
                }

                this.timeStatus = false;
                return {
                    invalidRange: true
                };
            }],
            [this.dateTimeValidation()]);

        this.priceControl = new FormControl(this.operation.price, (control: FormControl) => {
            const value = control.value;
            if (!value) {
                this.priceStatus = false;
                return {
                    invalidFormat: true
                };
            }

            if (isNumber(value)) {
                if (value > 0) {
                    this.priceStatus = true;
                    this.operation.price = value;
                    return null;
                }
            }

            this.priceStatus = false;
            return {
                invalidFormat: true
            };
        });
    }

    dateTimeValidation(): AsyncValidatorFn {
        return (formControl: FormControl): Observable<any> => {
            return from(this.operationValidator.validateDateTimeRange(this.operation).then(result => {
                this.dateTimeStatus = result === null;
            }).catch(error => {
                this.errorService.showError('Date time range validation error', error);
            }));
        };
    }

    async save() {
        let result;
        if (this.operation.id) {
            result = await this.crudService.update(Operation, this.operation);
        } else {
            result = await this.crudService.create(Operation, this.operation);
        }
        this.activeModal.close(result);
    }

    async setDate(date) {
        this.operation.date = this.dateFormatter.format(date);
        const result = await this.operationValidator.validateDateTimeRange(this.operation);
        this.dateTimeStatus = result === null;
    }

    addClient() {
        const modalRef = this.modalService.open(ClientEditComponent);
        modalRef.componentInstance.client = Client.getClientForCreate();
        modalRef.result.then((result) => {
            if (result && result.isNew) {
                this.clients.push(result.client);
                this.clientControl.setValue(result.client);
            }
        }).catch(error => {
            this.errorService.showError('Create client error', error);
        });
    }

    compare(first: any, second: any): boolean {
        return first.id === second.id;
    }
}
