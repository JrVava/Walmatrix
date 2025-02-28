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
exports.SaleDashboard = void 0;
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../../connection");
const helper_1 = require("../../helper/helper");
const moment_1 = __importDefault(require("moment"));
const loggingMiddleware_1 = require("../../service/loggingMiddleware");
let SaleDashboard = class SaleDashboard extends connection_1.DataSourceConnection {
    index(dataObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startDate, endDate, store_id, sale_batch, comparison_startDate, comparison_endDate, } = dataObj;
            const query = yield this.queryFunction(startDate, endDate, store_id);
            const graph = query.dateResults.map((date) => {
                const matchAdvertiserWithDate = query.advertiserResults.find((data) => {
                    if (data.date === date.date)
                        return data.total_ad_spend;
                });
                const matchOrderWithDate = query.orderResults.find((data) => {
                    if (data.date === date.date)
                        return data.total_order_amount;
                });
                const graph = {
                    tacos: 0,
                    troas: 0,
                    totalOrders: 0,
                    totalUnits: 0,
                    totalSales: 0,
                    ad_spend: 0,
                };
                if (matchAdvertiserWithDate) {
                    graph['tacos'] =
                        (matchAdvertiserWithDate.total_ad_spend /
                            matchOrderWithDate.total_order_amount) *
                            100;
                    graph['troas'] =
                        matchOrderWithDate.total_order_amount /
                            matchAdvertiserWithDate.total_ad_spend;
                    graph['ad_spend'] = matchAdvertiserWithDate.total_ad_spend;
                }
                if (matchOrderWithDate) {
                    graph['totalOrders'] = matchOrderWithDate.total_order;
                    graph['totalUnits'] = matchOrderWithDate.total_units;
                    graph['totalSales'] = matchOrderWithDate.total_order_amount;
                }
                return { dates: date.date, graph: graph };
            });
            const datesArray = graph.map((x) => x.dates);
            const graphArrayData = { datesArray: datesArray };
            if (sale_batch.includes('totalSales')) {
                graphArrayData['salesOrderArray'] = graph.map((x) => parseFloat(x.graph.totalSales));
                graphArrayData['total_sale'] = 'Total Sales';
            }
            if (sale_batch.includes('totalOrders')) {
                graphArrayData['ordersArray'] = graph.map((x) => parseFloat(x.graph.totalOrders));
                graphArrayData['total_order'] = 'Total Order';
            }
            if (sale_batch.includes('totalUnits')) {
                graphArrayData['orderUnitArray'] = graph.map((x) => parseFloat(x.graph.totalUnits));
                graphArrayData['total_unit'] = 'Total units';
            }
            if (sale_batch.includes('tacos')) {
                graphArrayData['tacosArray'] = graph.map((x) => parseFloat(x.graph.tacos.toFixed(2)));
                graphArrayData['tacos'] = 'Tacos';
            }
            if (sale_batch.includes('troas')) {
                graphArrayData['troasArray'] = graph.map((x) => parseFloat(x.graph.troas.toFixed(2)));
                graphArrayData['troas'] = 'Troas';
            }
            const totalAdSpend = graph
                .map((x) => +x.graph.ad_spend)
                .reduce((a, b) => a + b);
            const totalOrder = graph
                .map((x) => +x.graph.totalOrders)
                .reduce((a, b) => a + b);
            const totalSale = graph
                .map((x) => +x.graph.totalSales)
                .reduce((a, b) => a + b);
            const totalTAcos = (totalAdSpend / totalSale) * 100;
            const totalTRoas = totalSale / totalAdSpend;
            const totalUnit = graph
                .map((x) => +x.graph.totalUnits)
                .reduce((a, b) => a + b);
            const comparisonData = yield this.comparisonData(sale_batch, comparison_startDate, comparison_endDate, store_id);
            const currentDateData = {
                totalSale: totalSale,
                totalUnit: totalUnit,
                totalOrder: totalOrder,
                totalTAcos: parseFloat(totalTAcos.toFixed(2))
                    ? parseFloat(totalTAcos.toFixed(2))
                    : 0,
                totalTRoas: parseFloat(totalTRoas.toFixed(2))
                    ? parseFloat(totalTRoas.toFixed(2))
                    : 0,
                graphArrayData: graphArrayData,
            };
            return res.send({
                currentDateData: currentDateData,
                comparisonData: comparisonData,
            });
        });
    }
    comparisonData(sale_batch, startDT, endDT, store_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = yield this.queryFunction(startDT, endDT, store_id);
            const graph = query.dateResults.map((date) => {
                const matchAdvertiserWithDate = query.advertiserResults.find((data) => {
                    if (data.date === date.date)
                        return data.total_ad_spend;
                });
                const matchOrderWithDate = query.orderResults.find((data) => {
                    if (data.date === date.date)
                        return data.total_order_amount;
                });
                const graph = {
                    tacos: 0,
                    troas: 0,
                    totalOrders: 0,
                    totalUnits: 0,
                    totalSales: 0,
                };
                if (matchAdvertiserWithDate) {
                    graph['tacos'] =
                        (matchAdvertiserWithDate.total_ad_spend /
                            matchOrderWithDate.total_order_amount) *
                            100;
                    graph['troas'] =
                        matchOrderWithDate.total_order_amount /
                            matchAdvertiserWithDate.total_ad_spend;
                    graph['ad_spend'] = matchAdvertiserWithDate.total_ad_spend;
                }
                if (matchOrderWithDate) {
                    graph['totalOrders'] = matchOrderWithDate.total_order;
                    graph['totalUnits'] = matchOrderWithDate.total_units;
                    graph['totalSales'] = matchOrderWithDate.total_order_amount;
                }
                return { dates: date.date, graph: graph };
            });
            const datesArray = graph.map((x) => x.dates);
            const graphArrayData = { datesArray: datesArray };
            if (sale_batch.includes('totalSales')) {
                graphArrayData['salesOrderArray'] = graph.map((x) => parseFloat(x.graph.totalSales));
            }
            if (sale_batch.includes('totalOrders')) {
                graphArrayData['ordersArray'] = graph.map((x) => parseFloat(x.graph.totalOrders));
            }
            if (sale_batch.includes('totalUnits')) {
                graphArrayData['orderUnitArray'] = graph.map((x) => parseFloat(x.graph.totalUnits));
            }
            if (sale_batch.includes('tacos')) {
                graphArrayData['tacosArray'] = graph.map((x) => parseFloat(x.graph.tacos.toFixed(2)));
            }
            if (sale_batch.includes('troas')) {
                graphArrayData['troasArray'] = graph.map((x) => parseFloat(x.graph.troas.toFixed(2)));
            }
            const totalOrder = graph
                .map((x) => +x.graph.totalOrders)
                .reduce((a, b) => a + b);
            const totalUnit = graph
                .map((x) => +x.graph.totalUnits)
                .reduce((a, b) => a + b);
            const totalSale = graph
                .map((x) => +x.graph.totalSales)
                .reduce((a, b) => a + b);
            const totalAdSpend = graph
                .map((x) => +x.graph.ad_spend)
                .reduce((a, b) => a + b);
            const totalTAcos = (totalAdSpend / totalSale) * 100;
            const totalTRoas = totalSale / totalAdSpend;
            return {
                totalSale: totalSale,
                totalUnit: totalUnit,
                totalOrder: totalOrder,
                totalTAcos: parseFloat(totalTAcos.toFixed(2))
                    ? parseFloat(totalTAcos.toFixed(2))
                    : 0,
                totalTRoas: parseFloat(totalTRoas.toFixed(2))
                    ? parseFloat(totalTRoas.toFixed(2))
                    : 0,
                graphArrayData: graphArrayData,
            };
        });
    }
    queryFunction(startDT, endDT, store_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const getSchema = yield (0, helper_1.findSchemaNameWithArray)(store_id);
            const schema_name = getSchema.schemaName;
            const startDate = (0, moment_1.default)(startDT).format('YYYY-MM-DD');
            const endDate = (0, moment_1.default)(endDT).format('YYYY-MM-DD');
            const dateQuery = `SELECT TO_CHAR(generate_series('${startDate}'::date, '${endDate}'::date, '1 day'::interval), 'YYYY-MM-DD') AS date`;
            const getAdvertiser = `select
        TO_CHAR(gs.date,
        'YYYY-MM-DD') as date,
        cast(coalesce(SUM(subquery.ad_spend),
        0) as FLOAT) as total_ad_spend
    from
        (
        select
            generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
    left join
        (
        select cast(SUM(a.ad_spend) as DECIMAL(10,2)) as ad_spend,a.date
        from
        ${schema_name}.advertisers a
        where
            a.store_id in (${store_id})
            and a.date between '${startDate}' and '${endDate}'
        group by a.date)
            as subquery on
        gs.date = subquery.date
    group by
        gs.date
    order by
        gs.date asc;`;
            const orderQuery = `SELECT
                TO_CHAR(gs.date, 'YYYY-MM-DD') as date,
                    CAST(COALESCE(SUM(subquery.total_order_amount), 0) as FLOAT) AS total_order_amount,
                    subquery.total_order AS total_order,
                    subquery.total_units AS total_units
                FROM
                    (
                        SELECT generate_series('${startDate}'::date, '${endDate}'::date, '1 day'::interval) AS date
                    ) AS gs
                LEFT JOIN
                    (
                        SELECT
                        o.formated_date AS date,
                        SUM(oc.product_amount) AS total_order_amount,
                        COUNT(distinct oc.order_id) AS total_order,
                        COUNT(oc.order_id) AS total_units
                    FROM
                        ${schema_name}.orders o
                        LEFT JOIN ${schema_name}.order_charges oc ON oc.order_id = o.id
                    WHERE
                        o.store_id IN (${store_id})
                        AND oc.charge_type = 'PRODUCT'
                        AND oc.order_status != 'Cancelled'
                        AND o.formated_date BETWEEN '${startDate}' AND '${endDate}'
                    GROUP BY
                        o.formated_date
                    ) AS subquery
                ON
                    gs.date = subquery.date
                GROUP BY
                    gs.date,subquery.total_order,subquery.total_units
                ORDER BY
                    gs.date ASC;`;
            const dateResults = yield (yield this.publicConnection()).query(dateQuery);
            const advertiserResults = yield (yield this.publicConnection()).query(getAdvertiser);
            const orderResults = yield (yield this.publicConnection()).query(orderQuery);
            (yield this.connection(schema_name)).destroy();
            return {
                dateResults: dateResults,
                advertiserResults: advertiserResults,
                orderResults: orderResults,
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
], SaleDashboard.prototype, "index", null);
SaleDashboard = __decorate([
    (0, routing_controllers_1.JsonController)('/v2/sales-dashboard'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], SaleDashboard);
exports.SaleDashboard = SaleDashboard;
//# sourceMappingURL=SaleDashboard.js.map