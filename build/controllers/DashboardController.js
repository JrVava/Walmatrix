"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const moment_1 = __importDefault(require("moment"));
const helper_1 = require("../helper/helper");
let DashboardController = class DashboardController extends connection_1.DataSourceConnection {
    index(dataObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const salesMetricsAlias = dataObj.salesMetrics
                ? dataObj.salesMetrics
                : 'total_sales';
            const id = dataObj.store_id;
            const getSchema = yield (0, helper_1.findSchemaNameWithArray)(id);
            if (id.length > 0) {
                const startDate = (0, moment_1.default)(dataObj.startDate).format('YYYY-MM-DD');
                const endDate = (0, moment_1.default)(dataObj.endDate).format('YYYY-MM-DD');
                const comparisonStartDate = (0, moment_1.default)(dataObj.comparison_startDate).format('YYYY-MM-DD');
                const comparisonEndDate = (0, moment_1.default)(dataObj.comparison_endDate).format('YYYY-MM-DD');
                const schema_name = getSchema.schemaName;
                const advertiserRepository = (yield this.connection(schema_name)).getRepository(Index_1.Advertisers);
                const ordersRepository = (yield this.connection(schema_name)).getRepository(Index_1.Orders);
                const advertiserData = yield advertiserRepository
                    .createQueryBuilder('advertisers')
                    .select('CAST(SUM(ad_spend) AS DECIMAL(10, 2))', 'ad_spends')
                    .where('advertisers.store_id IN (:...values)', { values: id });
                const currentPeriodAdvertiserData = yield advertiserData
                    .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                    .getRawMany();
                const lastPeriodAdvertiserData = yield advertiserData
                    .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: comparisonStartDate,
                    endDate: comparisonEndDate,
                })
                    .getRawMany();
                const order = yield ordersRepository
                    .createQueryBuilder('o')
                    .select('SUM(oc.product_amount)', 'total_product_amount')
                    .addSelect('COUNT(distinct oc.order_id)', 'total_order')
                    .addSelect('COUNT(oc.order_id)', 'total_units')
                    .leftJoin('order_charges', 'oc', 'oc.order_id = o.id')
                    .where('o.store_id IN (:...store_id)', { store_id: id })
                    .andWhere('oc.charge_type = :charge_type', {
                    charge_type: 'PRODUCT',
                })
                    .andWhere('oc.order_status != :order_status', {
                    order_status: 'Cancelled',
                });
                const currentPeriodOrder = yield order
                    .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                    .getRawOne();
                const lastPeriodOrder = yield order
                    .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                    startDate: comparisonStartDate,
                    endDate: comparisonEndDate,
                })
                    .getRawOne();
                const data = {
                    troas: null,
                    tacos: null,
                    total_sale: null,
                    total_order: null,
                    total_units: null,
                };
                if (currentPeriodOrder) {
                    data.total_order = currentPeriodOrder.total_order;
                    data.total_units = currentPeriodOrder.total_units;
                    data.total_sale = currentPeriodOrder.total_product_amount;
                    const ad_spends = currentPeriodAdvertiserData[0].ad_spends === null
                        ? null
                        : currentPeriodAdvertiserData[0].ad_spends;
                    if (ad_spends != null) {
                        const troas = currentPeriodOrder.total_product_amount / ad_spends;
                        const tacos = (ad_spends / currentPeriodOrder.total_product_amount) *
                            100;
                        data.troas = troas ? troas.toFixed(2) : 0.0;
                        data.tacos = tacos.toFixed(2);
                    }
                }
                const lastPeriodData = {
                    troas: null,
                    tacos: null,
                    total_sale: null,
                    total_order: null,
                    total_units: null,
                };
                if (lastPeriodOrder) {
                    lastPeriodData.total_order = lastPeriodOrder.total_order;
                    lastPeriodData.total_units = lastPeriodOrder.total_units;
                    lastPeriodData.total_sale =
                        lastPeriodOrder.total_product_amount;
                    const ad_spends = lastPeriodAdvertiserData[0].ad_spends === null
                        ? null
                        : lastPeriodAdvertiserData[0].ad_spends;
                    if (ad_spends != null) {
                        const troas = lastPeriodOrder.total_product_amount / ad_spends;
                        const tacos = (ad_spends / lastPeriodOrder.total_product_amount) *
                            100;
                        lastPeriodData.troas = troas ? troas.toFixed(2) : 0.0;
                        lastPeriodData.tacos = tacos.toFixed(2);
                    }
                }
                const barChart = yield this.barChart(id, startDate, endDate, schema_name, salesMetricsAlias);
                (yield this.connection(schema_name)).destroy();
                return res.send({
                    data: data,
                    lastPeriodData: lastPeriodData,
                    barChart: barChart,
                    startDate: startDate,
                    endDate: endDate,
                    comparisonStartDate: comparisonStartDate,
                    comparisonEndDate: comparisonEndDate,
                });
            }
            else {
                return (res.status(500),
                    res.send({ message: "Sorry, you doesn't have store" }));
            }
        });
    }
    barChart(id, startDate, endDate, schema_name, salesMetricsAlias) {
        return __awaiter(this, void 0, void 0, function* () {
            const subquery = salesMetricsAlias === 'total_sales'
                ? 'SUM(oc.product_amount)'
                : 'COUNT(distinct oc.order_id)';
            const ordersRepository = (yield this.connection(schema_name)).getRepository(Index_1.Orders);
            const orders = yield ordersRepository
                .createQueryBuilder('o')
                .select('o.formated_date', 'date')
                // .addSelect('COUNT(distinct oc.order_id)', 'total_order')
                // .addSelect('SUM(oc.product_amount)', 'total_sales')
                .addSelect(subquery, salesMetricsAlias)
                .leftJoin('order_charges', 'oc', 'o.id = oc.order_id')
                .where('o.store_id IN (:...values)', { values: id })
                .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            })
                .andWhere('oc.charge_type = :charge_type', {
                charge_type: 'PRODUCT',
            })
                .andWhere('oc.order_status != :order_status', {
                order_status: 'Cancelled',
            })
                .groupBy('o.formated_date')
                .orderBy('o.formated_date')
                .getRawMany();
            const dates = [];
            const dateBelongingData = [];
            // const totalSales = [];
            orders.map((order) => {
                dates.push((0, moment_1.default)(order.date).format('YYYY-MM-DD'));
                dateBelongingData.push(parseFloat(order[salesMetricsAlias]));
                // totalSales.push(parseFloat(order.total_sales));
            });
            (yield this.connection(schema_name)).destroy();
            return {
                dates: dates,
                dateBelongingData: dateBelongingData,
                salesMetrics: salesMetricsAlias,
                // totalSales: totalSales,
            };
        });
    }
};
__decorate([
    (0, routing_controllers_1.Post)('/'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "index", null);
DashboardController = __decorate([
    (0, routing_controllers_1.JsonController)('/dashboard'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], DashboardController);
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map