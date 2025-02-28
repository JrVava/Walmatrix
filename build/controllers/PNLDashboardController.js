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
exports.PNLDashboardController = void 0;
const moment_1 = __importDefault(require("moment"));
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const helper_1 = require("../helper/helper");
const utils_1 = require("../modules/utils");
// import { group } from 'console';
let PNLDashboardController = class PNLDashboardController extends connection_1.DataSourceConnection {
    constructor() {
        super(...arguments);
        this.schema_name = null;
    }
    index(dataObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log("🚀 ~ file: PNLDashboardController.ts:393 ~ index ~ dataObj:", dataObj)
            // return {}
            const id = dataObj.store_id;
            const getSchema = yield (0, helper_1.findSchemaNameWithArray)(id);
            const userSettingRepository = yield (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const getReconManagement = yield userSettingRepository
                .createQueryBuilder('userSetting')
                .select('rm.available_date', 'available_date')
                .leftJoin('recon_management', 'rm', 'rm.user_setting_id = userSetting.id')
                .where('userSetting.store_id in (:...store_id)', { store_id: id })
                .andWhere('rm.is_file_read = :is_file_read', { is_file_read: true })
                .getRawMany();
            let getLatestDateReconManagement = '';
            if (getReconManagement.length > 0) {
                getLatestDateReconManagement = (0, utils_1.findLatestDate)(getReconManagement);
            }
            if (id.length > 0) {
                const startDate = (0, moment_1.default)(dataObj.startDate).format('YYYY-MM-DD');
                const endDate = (0, moment_1.default)(dataObj.endDate).format('YYYY-MM-DD');
                const comparison_startDate = (0, moment_1.default)(dataObj.comparison_startDate).format('YYYY-MM-DD');
                const comparison_endDate = (0, moment_1.default)(dataObj.comparison_endDate).format('YYYY-MM-DD');
                const dateQuery = `SELECT TO_CHAR(generate_series('${startDate}'::date, '${endDate}'::date, '1 day'::interval), 'YYYY-MM-DD') AS date`;
                const dateResults = yield (yield this.publicConnection()).query(dateQuery);
                const schema_name = getSchema.schemaName;
                const accountLevelfeesForGraph = yield this.accountLevelFeesForGraph(schema_name, id, startDate, endDate);
                const orderQuery = `SELECT
                TO_CHAR(gs.date, 'YYYY-MM-DD') as date,
                    CAST(COALESCE(SUM(subquery.total_order_amount), 0) as FLOAT) AS total_order_amount
                FROM
                    (
                        SELECT generate_series('${startDate}'::date, '${endDate}'::date, '1 day'::interval) AS date
                    ) AS gs
                LEFT JOIN
                    (
                        SELECT
                        o.formated_date AS date,
                        SUM(oc.product_amount) AS total_order_amount
                    FROM
                        ${schema_name}.orders o
                        LEFT JOIN ${schema_name}.order_charges oc ON oc.order_id = o.id
                    WHERE
                        o.store_id IN (${id})
                        AND oc.charge_type = 'PRODUCT'
                        AND oc.order_status != 'Cancelled'
                        AND o.formated_date BETWEEN '${startDate}' AND '${endDate}'
                    GROUP BY
                        o.formated_date
                    ) AS subquery
                ON
                    gs.date = subquery.date
                GROUP BY
                    gs.date
                ORDER BY
                    gs.date ASC;`;
                const orderResults = yield (yield this.publicConnection()).query(orderQuery);
                const wfsQuery = `select
                    TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_wfs_amount
                from
                    (
                    select generate_series('${startDate}'::date, '${endDate}'::date,'1 day'::interval) as date) as gs
                left join
                    (
                        select
                            r.transaction_posted_timestamp as date,
                            CAST(coalesce(SUM(r.amount),0) as FLOAT) as total_amount
                        from
                        ${schema_name}.recon r
                        where
                            r.store_id in (${id})
                            and r.transaction_posted_timestamp between '${startDate}' AND '${endDate}'
                            and r.transaction_type in ('Adjustment', 'Service Fee')
                            and r.transaction_description in ('WFS Fulfillment fee','"WFS Return Shipping fee "','Walmart Return Shipping Charge')
                            and r.amount_type in ('Fee/Reimbursement', 'Item Fees')
                            group by r.transaction_posted_timestamp
                    ) as subquery
                on
                    gs.date = subquery.date
                group by
                    gs.date
                order by
                    gs.date asc `;
                const wfsResults = yield (yield this.publicConnection()).query(wfsQuery);
                const disputesQuery = `select
                        TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_dispute_amount
                    from
                        (
                        select generate_series('${startDate}'::date, '${endDate}'::date,'1 day'::interval) as date) as gs
                    left join
                        (
                            select
                                r.transaction_posted_timestamp as date,
                                CAST(coalesce(SUM(r.amount),0) as FLOAT) as total_amount
                            from
                            ${schema_name}.recon r
                            where
                                r.store_id in (${id})
                                and r.transaction_posted_timestamp between '${startDate}' AND '${endDate}'
                                and r.transaction_type in ('Adjustment', 'Dispute Settlement')
                                and r.transaction_description in ('Walmart Return Shipping Charge Reversal','Walmart Customer Care Refund Reversal')
                                and r.amount_type in ('Fee/Reimbursement')
                                group by r.transaction_posted_timestamp
                        ) as subquery
                    on
                        gs.date = subquery.date
                    group by
                        gs.date
                    order by
                        gs.date asc `;
                const disputeResults = yield (yield this.publicConnection()).query(disputesQuery);
                const commissionQuery = `select
                        TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_commision_amount
                    from
                        (
                        select generate_series('${startDate}'::date, '${endDate}'::date,'1 day'::interval) as date) as gs
                    left join
                        (
                            select
                                r.transaction_posted_timestamp as date,
                                CAST(coalesce(SUM(r.amount),0) as FLOAT) as total_amount
                            from
                            ${schema_name}.recon r
                            where
                                r.store_id in (${id})
                                and r.transaction_posted_timestamp between '${startDate}' AND '${endDate}'
                                and r.amount_type in ('Commission on Product')
                                group by r.transaction_posted_timestamp
                        ) as subquery
                    on
                        gs.date = subquery.date
                    group by
                        gs.date
                    order by
                        gs.date asc `;
                const commissionResult = yield (yield this.publicConnection()).query(commissionQuery);
                const returnQuery = `select
                    TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_return_amount
                from
                    (
                    select generate_series('${startDate}'::date, '${endDate}'::date,'1 day'::interval) as date) as gs
                left join
                    (
                        select
                            r.transaction_posted_timestamp as date,
                            CAST(coalesce(SUM(r.amount),0) as FLOAT) as total_amount
                        from
                        ${schema_name}.recon r
                        where
                            r.store_id in (${id})
                            and r.transaction_posted_timestamp between '${startDate}' AND '${endDate}'
                            and r.transaction_type in ('Refund')
                            and r.transaction_description in ('Return Refund','Keep-it refund')
                            and r.amount_type in ('Product Price')
                            group by r.transaction_posted_timestamp
                    ) as subquery
                on
                    gs.date = subquery.date
                group by
                    gs.date
                order by
                    gs.date asc `;
                const returnResult = yield (yield this.publicConnection()).query(returnQuery);
                const ad_spendsQuery = `select
                    TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_ad_spend),0) as FLOAT) as total_ad_spend
                from
                    (
                    select generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
                left join
                    (
                    select a.date as date,sum(a.ad_spend) as total_ad_spend
                from
                    ${schema_name}.advertisers a
                where
                    a.store_id in (${id})
                    and a.date between '${startDate}' AND '${endDate}'
                    group by a.date
                    ) as subquery
                on
                    gs.date = subquery.date
                group by
                    gs.date
                order by
                    gs.date ASC`;
                const ad_spendResults = yield (yield this.publicConnection()).query(ad_spendsQuery);
                const cogsQuery = `select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.cogs_total),0) as FLOAT) as total_cogs_amount
            from
                (
                select generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
            left join
                (
                    select o.formated_date as date,  sum(c.amount) as cogs_total from ${schema_name}.orders o 
                    left join ${schema_name}.order_charges oc on oc.order_id = o.id
                    left join ${schema_name}.products p on p.sku = oc.sku
                    left join ${schema_name}.cogs c on c.product_id = p.id
                    where o.store_id in (${id})
                    and o.formated_date between '${startDate}' AND '${endDate}'
                    and oc.order_status != 'Cancelled'
                    and oc.charge_type = 'PRODUCT'
                    group by o.formated_date
                ) as subquery
            on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc `;
                const cogsResults = yield (yield this.publicConnection()).query(cogsQuery);
                const shippingQuery = `select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_shipping_amount
            from
                (
                select generate_series('${startDate}'::date, '${endDate}'::date,'1 day'::interval) as date) as gs
            left join
                (
                    select
                        r.transaction_posted_timestamp as date,
                        CAST(coalesce(SUM(r.amount),0) as FLOAT) as total_amount
                    from
                    ${schema_name}.recon r
                    where
                        r.store_id in (${id})
                        and r.transaction_posted_timestamp between '${startDate}' AND '${endDate}'
                        and r.transaction_type in ('Adjustment')
                        and r.transaction_description in ('Walmart Shipping Label Service Charge')
                        and r.amount_type in ('Fee/Reimbursement')
                        group by r.transaction_posted_timestamp
                ) as subquery
            on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc `;
                const shippingResults = yield (yield this.publicConnection()).query(shippingQuery);
                const capFeesQuery = `select
                    TO_CHAR(gs.date,'YYYY-MM-DD') as date,CAST(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_cap_fees_amount
                from
                    (
                    select generate_series('${startDate}'::date, '${endDate}'::date,'1 day'::interval) as date) as gs
                left join
                    (
                        select
                            r.transaction_posted_timestamp as date,
                            CAST(coalesce(SUM(r.amount),0) as FLOAT) as total_amount
                        from
                        ${schema_name}.recon r
                        where
                            r.store_id in (${id})
                            and r.amount_type in ('Total Walmart Funded Savings')
                            group by r.transaction_posted_timestamp
                    ) as subquery
                on
                    gs.date = subquery.date
                group by
                    gs.date
                order by
                    gs.date asc `;
                const capFeesResults = yield (yield this.publicConnection()).query(capFeesQuery);
                // const ad_spend = [];
                const pnlByDate = dateResults.map((date) => {
                    const matchingAdSpend = ad_spendResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_ad_spend;
                    });
                    const matchingOrder = orderResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_order_amount;
                    });
                    const matchingCapFees = capFeesResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_cap_fees_amount;
                    });
                    const matchingShippingResults = shippingResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_shipping_amount;
                    });
                    const matchingCogsResults = cogsResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_cogs_amount;
                    });
                    const matchingReturnResults = returnResult.find((data) => {
                        if (data.date === date.date)
                            return data.total_return_amount;
                    });
                    const matchingCommissionResult = commissionResult.find((data) => {
                        if (data.date === date.date)
                            return data.total_commision_amount;
                    });
                    const matchingDisputeResult = disputeResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_dispute_amount;
                    });
                    const matchingWfsResult = wfsResults.find((data) => {
                        if (data.date === date.date)
                            return data.total_wfs_amount;
                    });
                    const matchingAccountLevelfees = accountLevelfeesForGraph.find((data) => {
                        if (data.date === date.date)
                            return data.totalAccountLevelFees;
                    });
                    const pnlOfOrder = matchingOrder === undefined
                        ? 0
                        : matchingOrder.total_order_amount;
                    const pnlOfAdSpend = matchingAdSpend === undefined
                        ? 0
                        : matchingAdSpend.total_ad_spend;
                    const pnlOfCap = matchingCapFees === undefined
                        ? 0
                        : matchingCapFees.total_cap_fees_amount;
                    const pnlOfShipping = matchingShippingResults === undefined
                        ? 0
                        : matchingShippingResults.total_shipping_amount;
                    const pnlOfCogs = matchingCogsResults === undefined
                        ? 0
                        : matchingCogsResults.total_cogs_amount;
                    const pnlOfReturn = matchingReturnResults === undefined
                        ? 0
                        : matchingReturnResults.total_return_amount;
                    const pnlOfCommision = matchingCommissionResult === undefined
                        ? 0
                        : matchingCommissionResult.total_commision_amount;
                    const pnlOfDispute = matchingDisputeResult === undefined
                        ? 0
                        : matchingDisputeResult.total_dispute_amount;
                    const pnlOfWfs = matchingWfsResult === undefined
                        ? 0
                        : matchingWfsResult.total_wfs_amount;
                    const accountLevelFees = matchingAccountLevelfees === undefined
                        ? 0
                        : matchingAccountLevelfees.totalAccountLevelFees;
                    // order + cogs + cap -return - commission - wfsFulFillment - ad_spend - disputes - shipping
                    const totalPnlByDate = pnlOfOrder +
                        pnlOfCap +
                        Math.abs(pnlOfDispute) -
                        pnlOfCogs -
                        Math.abs(pnlOfReturn) -
                        Math.abs(pnlOfCommision) -
                        Math.abs(pnlOfWfs) -
                        Math.abs(pnlOfAdSpend) -
                        Math.abs(pnlOfShipping) -
                        accountLevelFees;
                    return { date: date.date, pnl: totalPnlByDate };
                });
                const pnlArray = pnlByDate.map((x) => parseFloat(x.pnl.toFixed(2)));
                const datesArray = pnlByDate.map((x) => x.date);
                const totalPNL = pnlByDate
                    .map((x) => x.pnl)
                    .reduce((a, b) => a + b);
                const differenceInDays = (0, moment_1.default)(dataObj.startDate).diff((0, moment_1.default)(dataObj.endDate), 'days');
                const daysCount = Math.abs(differenceInDays) + 1;
                const barChart = yield this.barChart(id, startDate, endDate, schema_name, daysCount);
                const item_fees = yield this.getitemLevelFee(schema_name, startDate, endDate, id);
                //total of item level
                const itemFeesTotal = item_fees.item_fees.sales +
                    item_fees.item_fees.disputes +
                    item_fees.item_fees.cap -
                    Math.abs(item_fees.item_fees.returns) -
                    Math.abs(item_fees.item_fees.commission) -
                    Math.abs(item_fees.item_fees.wfs_fulFillment) -
                    Math.abs(item_fees.item_fees.cogItem) -
                    item_fees.item_fees.ad_spend -
                    Math.abs(item_fees.item_fees.shipping_fees);
                const comparison_item_fees = yield this.getitemLevelFee(schema_name, comparison_startDate, comparison_endDate, id);
                const account_fees = yield this.getAccountLevelFee(schema_name, startDate, endDate, id);
                const comparison_account_fees = yield this.getAccountLevelFee(schema_name, comparison_startDate, comparison_endDate, id);
                //total of account level
                const accountFeesTotal = Object.values(account_fees.account_fees).reduce((a, b) => Math.abs(a) + Math.abs(b));
                // console.log("============pnlByDate===========", pnlByDate)
                // console.log("============sum of give date pnlByDate===========", pnlByDate.map(x => x.pnl).reduce((a, b) => a + b))
                // date = ['', '', '']
                (yield this.publicConnection()).destroy();
                (yield this.connection(schema_name)).destroy();
                return res.status(200).send({
                    reconAvailableTill: getLatestDateReconManagement,
                    pnlArray: pnlArray,
                    datesArray: datesArray,
                    totalPNL: totalPNL,
                    barChart: barChart,
                    item_fees: item_fees.item_fees,
                    account_fees: account_fees.account_fees,
                    item_fees_total: itemFeesTotal,
                    account_fees_total: accountFeesTotal,
                    comparison_item_fees: comparison_item_fees.item_fees,
                    comparison_account_fees: comparison_account_fees.account_fees,
                });
            }
            else {
                return res.status(500).send({ message: 'Sorry, Store is missing' });
            }
        });
    }
    pnlByItem(dataObj, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = dataObj.store_id;
            const filter = dataObj.filter;
            const getSchema = yield (0, helper_1.findSchemaNameWithArray)(id);
            if (id.length > 0) {
                const startDate = (0, moment_1.default)(dataObj.startDate);
                const endDate = (0, moment_1.default)(dataObj.endDate);
                const comparison_startDate = (0, moment_1.default)(dataObj.comparison_startDate);
                const comparison_endDate = (0, moment_1.default)(dataObj.comparison_endDate);
                const schema_name = getSchema.schemaName;
                const productRepository = (yield this.connection(schema_name)).getRepository(Index_1.Products);
                const data = yield (0, utils_1.getPnlByItem)(productRepository, startDate, endDate, id, filter);
                const comparison_data = yield (0, utils_1.getPnlByItem)(productRepository, comparison_startDate, comparison_endDate, id);
                // const data = await this.pnlByItemData(
                //     productRepository,
                //     startDate,
                //     endDate,
                //     id,
                //     filter,
                // );
                // const comparison_data = await this.pnlByItemData(
                //     productRepository,
                //     comparison_startDate,
                //     comparison_endDate,
                //     id,
                // );
                (yield this.publicConnection()).destroy();
                (yield this.connection(schema_name)).destroy();
                // const result = data.map((item, index) => ({
                //     id: item.id,
                //     comparison_id: comparison_data[index].id,
                //     sku: item.sku,
                //     comparison_sku: comparison_data[index].sku,
                //     item_id: item.item_id,
                //     comparison_item_id: comparison_data[index].item_id,
                //     product_name: item.product_name,
                //     comparison_product_name: comparison_data[index].product_name,
                //     gtin: item.gtin,
                //     comparison_gtin: comparison_data[index].gtin,
                //     product_url: item.product_url,
                //     comparison_product_url: comparison_data[index].product_url,
                //     image: item.image,
                //     comparison_image: comparison_data[index].image,
                //     product_price: item.product_price,
                //     comparison_product_price: comparison_data[index].product_price,
                //     total_amount_sale: item.total_amount_sale,
                //     comparison_total_amount_sale:
                //         comparison_data[index].total_amount_sale,
                //     adv_count: item.adv_count,
                //     comparison_adv_count: comparison_data[index].adv_count,
                //     ad_spend: item.ad_spend,
                //     comparison_ad_spend: comparison_data[index].ad_spend,
                //     ad_sales: item.ad_sales,
                //     comparison_ad_sales: comparison_data[index].ad_sales,
                //     ad_units: item.ad_units,
                //     comparison_ad_units: comparison_data[index].ad_units,
                //     impressions: item.impressions,
                //     comparison_impressions: comparison_data[index].impressions,
                //     total_clicks: item.total_clicks,
                //     comparison_total_clicks: comparison_data[index].total_clicks,
                //     adv_orders: item.adv_orders,
                //     comparison_adv_orders: comparison_data[index].adv_orders,
                //     cap_total: item.cap_total,
                //     comparison_cap_total: comparison_data[index].cap_total,
                //     organic_sales: item.organic_sales,
                //     comparison_organic_sales: comparison_data[index].organic_sales,
                //     organic_sales_percentage: item.organic_sales_percentage,
                //     comparison_organic_sales_percentage:
                //         comparison_data[index].organic_sales_percentage,
                //     roas: item.roas,
                //     comparison_roas: comparison_data[index].roas,
                //     troas: item.troas,
                //     comparison_troas: comparison_data[index].troas,
                //     acos: item.acos,
                //     comparison_acos: comparison_data[index].acos,
                //     tacos: item.tacos,
                //     comparison_tacos: comparison_data[index].tacos,
                //     units_sold: item.units_sold,
                //     comparison_units_sold: comparison_data[index].units_sold,
                //     average_price: item.average_price,
                //     comparison_average_price: comparison_data[index].average_price,
                //     ctr: item.ctr,
                //     comparison_ctr: comparison_data[index].ctr,
                //     cvr_oder: item.cvr_oder,
                //     comparison_cvr_oder: comparison_data[index].cvr_oder,
                //     cvr_unit: item.cvr_unit,
                //     comparison_cvr_unit: comparison_data[index].cvr_unit,
                //     total_wfs_amount: item.total_wfs_amount,
                //     comparison_total_wfs_amount:
                //         comparison_data[index].total_wfs_amount,
                //     total_dispute_amount: item.total_dispute_amount,
                //     comparison_total_dispute_amount:
                //         comparison_data[index].total_dispute_amount,
                //     total_commission_amount: item.total_commission_amount,
                //     comparison_total_commission_amount:
                //         comparison_data[index].total_commission_amount,
                //     total_return_amount: item.total_return_amount,
                //     comparison_total_return_amount:
                //         comparison_data[index].total_return_amount,
                //     shipping_total: item.shipping_total,
                //     comparison_shipping_total:
                //         comparison_data[index].shipping_total,
                //     cogs_total: item.cogs_total,
                //     comparison_cogs_total: comparison_data[index].cogs_total,
                //     return_unit: item.return_unit,
                //     comparison_return_unit: comparison_data[index].return_unit,
                // }));
                const result = [];
                data.map((item) => {
                    comparison_data.find((comparison) => {
                        if (item.item_id === comparison.item_id) {
                            // if (item.sku === '187490000960') {
                            //     console.log('item.tacos', item.tacos);
                            //     console.log(
                            //         'item.tacos Calulate',
                            //         item.tacos * 100,
                            //     );
                            // }
                            result.push({
                                id: item.id,
                                comparison_id: comparison.id,
                                sku: item.sku,
                                comparison_sku: comparison.sku,
                                item_id: item.item_id,
                                comparison_item_id: comparison.item_id,
                                product_name: item.product_name,
                                comparison_product_name: comparison.product_name,
                                gtin: item.gtin,
                                comparison_gtin: comparison.gtin,
                                product_url: item.product_url,
                                comparison_product_url: comparison.product_url,
                                image: item.image,
                                comparison_image: comparison.image,
                                product_price: item.product_price,
                                comparison_product_price: comparison.product_price,
                                total_amount_sale: item.total_amount_sale,
                                comparison_total_amount_sale: comparison.total_amount_sale,
                                adv_count: item.adv_count,
                                comparison_adv_count: comparison.adv_count,
                                ad_spend: item.ad_spend,
                                comparison_ad_spend: comparison.ad_spend,
                                ad_sales: item.ad_sales,
                                comparison_ad_sales: comparison.ad_sales,
                                ad_units: item.ad_units,
                                comparison_ad_units: comparison.ad_units,
                                impressions: item.impressions,
                                comparison_impressions: comparison.impressions,
                                total_clicks: item.total_clicks,
                                comparison_total_clicks: comparison.total_clicks,
                                adv_orders: item.adv_orders,
                                comparison_adv_orders: comparison.adv_orders,
                                cap_total: item.cap_total,
                                comparison_cap_total: comparison.cap_total,
                                organic_sales: item.organic_sales,
                                comparison_organic_sales: comparison.organic_sales,
                                organic_sales_percentage: item.organic_sales_percentage * 100,
                                comparison_organic_sales_percentage: comparison.organic_sales_percentage * 100,
                                roas: item.roas,
                                comparison_roas: comparison.roas,
                                troas: item.troas,
                                comparison_troas: comparison.troas,
                                acos: item.acos * 100,
                                comparison_acos: comparison.acos * 100,
                                tacos: item.tacos * 100,
                                comparison_tacos: comparison.tacos * 100,
                                units_sold: item.units_sold,
                                comparison_units_sold: comparison.units_sold,
                                average_price: item.average_price,
                                comparison_average_price: comparison.average_price,
                                ctr: item.ctr * 100,
                                comparison_ctr: comparison.ctr * 100,
                                cvr_oder: item.cvr_oder * 100,
                                comparison_cvr_oder: comparison.cvr_oder * 100,
                                cvr_unit: item.cvr_unit * 100,
                                comparison_cvr_unit: comparison.cvr_unit * 100,
                                total_wfs_amount: item.total_wfs_amount,
                                comparison_total_wfs_amount: comparison.total_wfs_amount,
                                total_dispute_amount: item.total_dispute_amount,
                                comparison_total_dispute_amount: comparison.total_dispute_amount,
                                total_commission_amount: item.total_commission_amount,
                                comparison_total_commission_amount: comparison.total_commission_amount,
                                total_return_amount: item.total_return_amount,
                                comparison_total_return_amount: comparison.total_return_amount,
                                shipping_total: item.shipping_total,
                                comparison_shipping_total: comparison.shipping_total,
                                cogs_total: item.cogs_total,
                                comparison_cogs_total: comparison.cogs_total,
                                return_unit: item.return_unit,
                                comparison_return_unit: comparison.return_unit,
                            });
                        }
                    });
                });
                return res.status(200).send({
                    data: result,
                });
            }
        });
    }
    barChart(id, startDate, endDate, schema_name, daysCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const reconRepository = (yield this.connection(schema_name)).getRepository(Index_1.Recon);
            const advertiserRepository = (yield this.connection(schema_name)).getRepository(Index_1.Advertisers);
            if (id.length > 0) {
                const subqueryAccountFees = yield reconRepository
                    .createQueryBuilder('recon')
                    .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                    .addSelect("TO_CHAR(recon.transaction_posted_timestamp, 'YYYY-MM-DD')", 'date')
                    .where('recon.store_id IN (:...values)', { values: id })
                    .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                });
                const inboundTransportationFee = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS InboundTransportationFee' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const storageFee = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS StorageFee' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const lostInventory = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS LostInventory' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const foundInventory = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS FoundInventory' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const refund = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS Refund' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const damageInWarehouse = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS DamageInWarehouse' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const rc_InventoryDisposalFee = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS RC_InventoryDisposalFee' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const prepServiceFee = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS PrepServiceFee' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const inventoryTransferFee = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS InventoryTransferFee' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const rc_InventoryRTVFee = yield subqueryAccountFees
                    .andWhere('transaction_description = :transaction_description', { transaction_description: 'WFS RC_InventoryRTVFee' })
                    .groupBy('recon.transaction_posted_timestamp')
                    .getRawMany();
                const ad_logo = yield advertiserRepository
                    .createQueryBuilder('advertisers')
                    .select('sum(advertisers.ad_spend)', 'total_ad_spend')
                    .addSelect("TO_CHAR(advertisers.date, 'YYYY-MM-DD')", 'date')
                    .where('advertisers.store_id IN (:...values)', { values: id })
                    .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                    .andWhere('advertisers.item_name = :item_name', {
                    item_name: 'Logo',
                })
                    .groupBy('advertisers.date')
                    .getRawMany();
                // let datesArray = [];
                const inBoundTransportationFeeArray = [];
                const storageFeesArray = [];
                const lostinventoryArray = [];
                const foundInventoryArray = [];
                const refundArray = [];
                const damageInWareHouseArray = [];
                const rc_InventoryDisposalFeeArray = [];
                const prepServiceFeeArray = [];
                const inventoryTransferFeeArray = [];
                const rc_InventoryRTVFeeArray = [];
                const ad_logoArray = [];
                for (let index = 0; index < daysCount; index++) {
                    const currentDate = (0, moment_1.default)(startDate)
                        .clone()
                        .add(index, 'days');
                    const formattedDate = currentDate.format('YYYY-MM-DD');
                    // Find the matching record in inboundTransportationFee
                    if (inboundTransportationFee.length > 0 &&
                        inboundTransportationFee != null) {
                        const matchingInboundRecord = inboundTransportationFee.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingInboundRecord) {
                            inBoundTransportationFeeArray[index] = parseFloat(matchingInboundRecord.total_amount);
                        }
                        else {
                            inBoundTransportationFeeArray[index] = 0;
                        }
                    }
                    if (storageFee.length > 0 && storageFee != null) {
                        const matchingStorageRecord = storageFee.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingStorageRecord) {
                            storageFeesArray[index] = parseFloat(matchingStorageRecord.total_amount);
                        }
                        else {
                            storageFeesArray[index] = 0;
                        }
                    }
                    if (lostInventory.length > 0 && lostInventory != null) {
                        const matchingLostInvntoryRecord = lostInventory.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingLostInvntoryRecord) {
                            lostinventoryArray[index] = parseFloat(matchingLostInvntoryRecord.total_amount);
                        }
                        else {
                            lostinventoryArray[index] = 0;
                        }
                    }
                    if (foundInventory.length > 0 && foundInventory != null) {
                        const matchingFoundInventoryRecord = foundInventory.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingFoundInventoryRecord) {
                            foundInventoryArray[index] = parseFloat(matchingFoundInventoryRecord.total_amount);
                        }
                        else {
                            foundInventoryArray[index] = 0;
                        }
                    }
                    if (refund.length > 0 && refund != null) {
                        const matchingRefundRecord = refund.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingRefundRecord) {
                            refundArray[index] = parseFloat(matchingRefundRecord.total_amount);
                        }
                        else {
                            refundArray[index] = 0;
                        }
                    }
                    if (damageInWarehouse.length > 0 && damageInWarehouse != null) {
                        const matchingDamageInWarehouseRecord = damageInWarehouse.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingDamageInWarehouseRecord) {
                            damageInWareHouseArray[index] = parseFloat(matchingDamageInWarehouseRecord.total_amount);
                        }
                        else {
                            damageInWareHouseArray[index] = 0;
                        }
                    }
                    //rc_InventoryDisposalFee
                    if (rc_InventoryDisposalFee.length > 0 &&
                        rc_InventoryDisposalFee != null) {
                        const matchingRC_InventoryDisposalFeeRecord = rc_InventoryDisposalFee.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingRC_InventoryDisposalFeeRecord) {
                            rc_InventoryDisposalFeeArray[index] = parseFloat(matchingRC_InventoryDisposalFeeRecord.total_amount);
                        }
                        else {
                            rc_InventoryDisposalFeeArray[index] = 0;
                        }
                    }
                    if (prepServiceFee.length > 0 && prepServiceFee != null) {
                        const matchingPrepServiceFeeRecord = prepServiceFee.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingPrepServiceFeeRecord) {
                            prepServiceFeeArray[index] = parseFloat(matchingPrepServiceFeeRecord.total_amount);
                        }
                        else {
                            prepServiceFeeArray[index] = 0;
                        }
                    }
                    if (inventoryTransferFee.length > 0 &&
                        inventoryTransferFee != null) {
                        const matchingInventoryTransferFeeRecord = inventoryTransferFee.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingInventoryTransferFeeRecord) {
                            inventoryTransferFeeArray[index] = parseFloat(matchingInventoryTransferFeeRecord.total_amount);
                        }
                        else {
                            inventoryTransferFeeArray[index] = 0;
                        }
                    }
                    if (rc_InventoryRTVFee.length > 0 &&
                        rc_InventoryRTVFee != null) {
                        const matchingRC_InventoryRTVFeeRecord = rc_InventoryRTVFee.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingRC_InventoryRTVFeeRecord) {
                            rc_InventoryRTVFeeArray[index] = parseFloat(matchingRC_InventoryRTVFeeRecord.total_amount);
                        }
                        else {
                            rc_InventoryRTVFeeArray[index] = 0;
                        }
                    }
                    if (ad_logo.length > 0 && ad_logo != null) {
                        const matchingAD_logoRecord = ad_logo.find((record) => {
                            return formattedDate === record.date;
                        });
                        if (matchingAD_logoRecord) {
                            ad_logoArray[index] = parseFloat(matchingAD_logoRecord.total_ad_spend);
                        }
                        else {
                            ad_logoArray[index] = 0;
                        }
                    }
                    // datesArray.push(formattedDate);
                }
                const accountLevelfees = {
                    inboundTransportationFee: inBoundTransportationFeeArray,
                    storageFees: storageFeesArray,
                    lostinventory: lostinventoryArray,
                    foundInventory: foundInventoryArray,
                    refund: refundArray,
                    damageInWareHouse: damageInWareHouseArray,
                    rc_InventoryDisposalFee: rc_InventoryDisposalFeeArray,
                    prepServiceFee: prepServiceFeeArray,
                    inventoryTransferFee: inventoryTransferFeeArray,
                    rc_InventoryRTVFee: rc_InventoryRTVFeeArray,
                    ad_logo: ad_logoArray,
                };
                (yield this.connection(schema_name)).destroy();
                return {
                    accountLevelfees: accountLevelfees,
                };
            }
            return {};
        });
    }
    getAccountLevelFee(schema_name, startDate, endDate, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const reconRepository = (yield this.connection(schema_name)).getRepository(Index_1.Recon);
            const advertiserRepository = (yield this.connection(schema_name)).getRepository(Index_1.Advertisers);
            const subqueryAccountFees = yield reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.store_id IN (:...values)', { values: id })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            });
            const inboundTransportationFee = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS InboundTransportationFee',
            })
                .getRawOne();
            const storageFee = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS StorageFee',
            })
                .getRawOne();
            const lostInventory = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS LostInventory',
            })
                .getRawOne();
            const foundInventory = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS FoundInventory',
            })
                .getRawOne();
            const refund = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS Refund',
            })
                .getRawOne();
            const damageInWarehouse = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS DamageInWarehouse',
            })
                .getRawOne();
            const rc_InventoryDisposalFee = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS RC_InventoryDisposalFee',
            })
                .getRawOne();
            const prepServiceFee = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS PrepServiceFee',
            })
                .getRawOne();
            const inventoryTransferFee = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS InventoryTransferFee',
            })
                .getRawOne();
            const rc_InventoryRTVFee = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS RC_InventoryRTVFee',
            })
                .getRawOne();
            const reviewAccelerator = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'Review Accelerator',
            })
                .getRawOne();
            const WFSInventoryRemovalOrder = yield subqueryAccountFees
                .andWhere('transaction_description = :transaction_description', {
                transaction_description: 'WFS InventoryRemovalOrder',
            })
                .getRawOne();
            const ad_logo = yield advertiserRepository
                .createQueryBuilder('advertisers')
                .select('sum(advertisers.ad_spend)', 'total_ad_spend')
                .where('advertisers.store_id IN (:...values)', { values: id })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            })
                .andWhere('advertisers.item_name = :item_name', {
                item_name: 'Logo',
            })
                .getRawOne();
            const account_fees = {
                inboundTransportationFee: inboundTransportationFee &&
                    inboundTransportationFee.total_amount != null
                    ? parseFloat(inboundTransportationFee.total_amount)
                    : 0,
                storageFee: storageFee && storageFee.total_amount != null
                    ? parseFloat(storageFee.total_amount)
                    : 0,
                lostInventory: lostInventory && lostInventory.total_amount != null
                    ? parseFloat(lostInventory.total_amount)
                    : 0,
                foundInventory: foundInventory && foundInventory.total_amount != null
                    ? parseFloat(foundInventory.total_amount)
                    : 0,
                refund: refund && refund.total_amount != null
                    ? parseFloat(refund.total_amount)
                    : 0,
                damageInWarehouse: damageInWarehouse && damageInWarehouse.total_amount != null
                    ? parseFloat(damageInWarehouse.total_amount)
                    : 0,
                rc_InventoryDisposalFee: rc_InventoryDisposalFee &&
                    rc_InventoryDisposalFee.total_amount != null
                    ? parseFloat(rc_InventoryDisposalFee.total_amount)
                    : 0,
                prepServiceFee: prepServiceFee && prepServiceFee.total_amount != null
                    ? parseFloat(prepServiceFee.total_amount)
                    : 0,
                inventoryTransferFee: inventoryTransferFee &&
                    inventoryTransferFee.total_amount != null
                    ? parseFloat(inventoryTransferFee.total_amount)
                    : 0,
                rc_InventoryRTVFee: rc_InventoryRTVFee && rc_InventoryRTVFee.total_amount != null
                    ? parseFloat(rc_InventoryRTVFee.total_amount)
                    : 0,
                reviewAccelerator: reviewAccelerator && reviewAccelerator.total_amount != null
                    ? parseFloat(reviewAccelerator.total_amount)
                    : 0,
                ad_logo: ad_logo && ad_logo.total_ad_spend != null
                    ? parseFloat(ad_logo.total_ad_spend)
                    : 0,
                inventoryRemovalOrder: WFSInventoryRemovalOrder &&
                    WFSInventoryRemovalOrder.total_amount != null
                    ? parseFloat(WFSInventoryRemovalOrder.total_amount)
                    : 0,
            };
            (yield this.connection(schema_name)).destroy();
            return { account_fees: account_fees };
        });
    }
    getitemLevelFee(schema_name, startDate, endDate, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const ordersRepository = (yield this.connection(schema_name)).getRepository(Index_1.Orders);
            const reconRepository = (yield this.connection(schema_name)).getRepository(Index_1.Recon);
            const advertiserRepository = (yield this.connection(schema_name)).getRepository(Index_1.Advertisers);
            const subQueryOrder = yield ordersRepository
                .createQueryBuilder('o')
                .select('sum(oc.product_amount)', 'total_order_amount')
                .leftJoin('order_charges', 'oc', 'oc.order_id = o.id')
                .andWhere('o.store_id IN (:...values)', { values: id })
                .andWhere('oc.charge_type = :charge_type', {
                charge_type: 'PRODUCT',
            })
                .andWhere('oc.order_status != :order_status', {
                order_status: 'Cancelled',
            })
                .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            });
            const sale = yield subQueryOrder.getRawOne();
            const returnBaseQuery = yield reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.transaction_type = :transaction_type', {
                transaction_type: 'Refund',
            })
                .andWhere('recon.transaction_description IN (:...transaction_description)', {
                transaction_description: [
                    'Return Refund',
                    'Keep-it refund',
                ],
            })
                .andWhere('recon.amount_type = :amount_type', {
                amount_type: 'Product Price',
            })
                .andWhere('recon.store_id IN (:...values)', { values: id })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            });
            const returnItemFees = yield returnBaseQuery.getRawOne();
            const subQueryAdspend = yield advertiserRepository
                .createQueryBuilder('advertisers')
                .select('sum(advertisers.ad_spend)', 'total_ad_spend')
                .where('advertisers.store_id IN (:...values)', { values: id })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            });
            // .orderBy('advertisers.date', 'ASC')
            // .groupBy('advertisers.date');
            const ad_spendItemfees = yield subQueryAdspend.getRawOne();
            const commissionBaseQuery = yield reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.amount_type = :amountTypes', {
                amountTypes: 'Commission on Product',
            })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            })
                .andWhere('recon.store_id IN (:...values)', { values: id });
            const commissionItemFees = yield commissionBaseQuery.getRawOne();
            const wfsBaseQuery = reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.transaction_type IN (:...transactionTypes)', {
                transactionTypes: ['Adjustment', 'Service Fee'],
            })
                .andWhere('recon.transaction_description IN (:...transactionDescriptions)', {
                transactionDescriptions: [
                    'WFS Fulfillment fee',
                    '"WFS Return Shipping fee "',
                    'Walmart Return Shipping Charge',
                ],
            })
                .andWhere('recon.amount_type IN (:...amountTypes)', {
                amountTypes: ['Fee/Reimbursement', 'Item Fees'],
            })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            })
                .andWhere('recon.store_id IN (:...values)', { values: id });
            // .getRawMany();
            const wfsFulFillmentItemFees = yield wfsBaseQuery.getRawOne();
            const subQueryCogs = yield ordersRepository
                .createQueryBuilder('o')
                .select('sum(c.amount)', 'cogs_total')
                .leftJoin('order_charges', 'oc', 'oc.order_id = o.id')
                .leftJoin('products', 'p', 'p.sku = oc.sku')
                .leftJoin('cogs', 'c', 'c.product_id = p.id')
                .where('o.store_id IN (:...values)', { values: id })
                .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            })
                .andWhere('oc.order_status != :order_status', {
                order_status: 'Cancelled',
            })
                .andWhere('oc.charge_type = :charge_type', {
                charge_type: 'PRODUCT',
            });
            const cogItemFess = yield subQueryCogs.getRawOne();
            const disputesBaseQuery = reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.transaction_type IN (:...transactionTypes)', {
                transactionTypes: ['Adjustment', 'Dispute Settlement'],
            })
                .andWhere('recon.transaction_description IN (:...transactionDescriptions)', {
                transactionDescriptions: [
                    'Walmart Return Shipping Charge Reversal',
                    'Walmart Customer Care Refund Reversal',
                ],
            })
                .andWhere('recon.amount_type = :amountTypes', {
                amountTypes: 'Fee/Reimbursement',
            })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            })
                .andWhere('recon.store_id IN (:...values)', { values: id });
            const disputesItemfess = yield disputesBaseQuery.getRawOne();
            const subqueryShipping = yield reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.transaction_type = :transaction_type', {
                transaction_type: 'Adjustment',
            })
                .andWhere('recon.transaction_description = :transaction_description', {
                transaction_description: 'Walmart Shipping Label Service Charge',
            })
                .andWhere('recon.amount_type = :amount_type', {
                amount_type: 'Fee/Reimbursement',
            })
                // .andWhere('recon.store_id = :id', { id: id })
                .andWhere('recon.store_id IN (:...values)', { values: id })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            });
            const sippingItemFees = yield subqueryShipping.getRawOne();
            const subQueryCap = yield reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .andWhere('recon.amount_type = :amount_type', {
                amount_type: 'Total Walmart Funded Savings',
            })
                // .andWhere('recon.store_id = :id', { id: id })
                .andWhere('recon.store_id IN (:...values)', { values: id })
                .andWhere('recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                startDate: startDate,
                endDate: endDate,
            });
            const capItemFees = yield subQueryCap.getRawOne();
            const item_fees = {
                sales: sale && sale.total_order_amount != null
                    ? parseFloat(sale.total_order_amount)
                    : 0,
                returns: returnItemFees && returnItemFees.total_amount != null
                    ? parseFloat(returnItemFees.total_amount)
                    : 0,
                ad_spend: ad_spendItemfees && ad_spendItemfees.total_ad_spend != null
                    ? parseFloat(ad_spendItemfees.total_ad_spend)
                    : 0,
                commission: commissionItemFees && commissionItemFees.total_amount != null
                    ? parseFloat(commissionItemFees.total_amount)
                    : 0,
                wfs_fulFillment: wfsFulFillmentItemFees &&
                    wfsFulFillmentItemFees.total_amount != null
                    ? parseFloat(wfsFulFillmentItemFees.total_amount)
                    : 0,
                cogItem: cogItemFess && cogItemFess.cogs_total != null
                    ? parseFloat(cogItemFess.cogs_total)
                    : 0,
                disputes: disputesItemfess && disputesItemfess.total_amount != null
                    ? parseFloat(disputesItemfess.total_amount)
                    : 0,
                shipping_fees: sippingItemFees && sippingItemFees.total_amount != null
                    ? parseFloat(sippingItemFees.total_amount)
                    : 0,
                cap: capItemFees && capItemFees.total_amount != null
                    ? parseFloat(capItemFees.total_amount)
                    : 0,
            };
            (yield this.connection(schema_name)).destroy();
            return { item_fees: item_fees };
        });
    }
    pnlByItemData(productRepository, startDate, endDate, id, filter = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryBuilder = yield productRepository
                .createQueryBuilder('p')
                .select('p.id', 'id')
                .addSelect('p.sku', 'sku')
                .addSelect('p.item_id', 'item_id')
                .addSelect('p.primary_image_url', 'image')
                .addSelect('p.product_name', 'product_name')
                .addSelect('p.item_page_url', 'product_url')
                .addSelect('CAST(p.price AS FLOAT)', 'product_price')
                .addSelect('coalesce(SUM(oc.total_amount_sale),0)', 'total_amount_sale')
                .addSelect('coalesce(oc.order_line_number,0)', 'units_sold')
                .addSelect('CAST(COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(SUM(oc.total_amount_sale) / coalesce(oc.order_line_number,0) AS DECIMAL(10, 2)) ELSE 0 END, 0) AS FLOAT)', 'average_price')
                /**
                 * Get Advertiser Data Query Start Here
                 */
                .addSelect('COALESCE(adv.adv_count,0)', 'adv_count')
                .addSelect('COALESCE(adv.ad_spend,0)', 'ad_spend')
                .addSelect('COALESCE(adv.ad_sales,0)', 'ad_sales')
                .addSelect('COALESCE(adv.ad_units,0)', 'ad_units')
                .addSelect('COALESCE(adv.impressions,0)', 'impressions')
                .addSelect('COALESCE(adv.total_clicks,0)', 'total_clicks')
                .addSelect('COALESCE(adv.orders,0)', 'adv_orders')
                /**
                 * Get Advertiser Data Query End Here
                 */
                .addSelect('p.gtin', 'gtin')
                /**
                 * Get Cap Fees Data Start Here
                 */
                // .addSelect('cap.cap_amount', 'cap_total')
                /**
                 * Get Cap Fees Data End Here
                 */
                /**
                 * Arthematic Calculation Query Start Below
                 */
                .addSelect('CAST(coalesce(SUM(oc.total_amount_sale) - adv.ad_sales,0) AS FLOAT)', 'organic_sales')
                // .addSelect(
                //     'CAST(CASE WHEN coalesce(SUM(oc.total_amount_sale),0) > 0 THEN (coalesce(oc.total_amount_sale,0)- coalesce(adv.ad_sales,0))  / coalesce(SUM(oc.total_amount_sale),0) ELSE 0 END AS FLOAT)',
                //     // 'CAST((coalesce(SUM(oc.total_amount_sale),0) - coalesce(adv.ad_sales,0)) / coalesce(SUM(oc.total_amount_sale),0) AS FLOAT)',
                //     'organic_sales_percentage',
                // )
                .addSelect(`
                CASE
                WHEN coalesce(SUM(oc.total_amount_sale), 0) = 0 THEN 0
                ELSE (coalesce(SUM(oc.total_amount_sale), 0) - coalesce(adv.ad_sales, 0)) / coalesce(SUM(oc.total_amount_sale), 0)
                END
                AS organic_sales_percentage
            `)
                .addSelect('CAST(CASE WHEN adv.ad_spend > 0 THEN CAST(adv.ad_sales / adv.ad_spend AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'roas')
                .addSelect('CAST(CASE WHEN adv.ad_spend > 0 THEN CAST(coalesce(SUM(oc.total_amount_sale),0) / coalesce(adv.ad_spend,0)  AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'troas')
                // .addSelect(
                //     'CAST(CASE WHEN adv.ad_sales > 0 THEN CAST(adv.ad_spend / adv.ad_sales AS FLOAT) * 100 ELSE 0 END)',
                //     'acos',
                // )
                .addSelect('CASE WHEN adv.ad_sales > 0 THEN CAST((adv.ad_spend / adv.ad_sales) AS FLOAT) ELSE 0 END', 'acos')
                // .addSelect(
                //     'CAST(COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(adv.ad_spend / SUM(oc.total_amount_sale) AS DECIMAL(10, 2)) ELSE 0  END, 0) AS FLOAT)',
                //     'tacos',
                // )
                .addSelect('COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(adv.ad_spend / SUM(oc.total_amount_sale) AS FLOAT) ELSE 0 END)', 'tacos')
                .addSelect('CAST(coalesce(adv.total_clicks,0) AS FLOAT)', 'total_clicks')
                // .addSelect(
                //     'CAST(CASE WHEN adv.impressions > 0 THEN CAST(adv.total_clicks / adv.impressions  AS FLOAT) ELSE 0 END)',
                //     'ctr',
                // )
                .addSelect('CASE WHEN adv.impressions > 0 THEN CAST(CAST(adv.total_clicks AS FLOAT) / adv.impressions AS FLOAT) ELSE 0 END', 'ctr')
                // .addSelect(
                //     'CAST WHEN adv.total_clicks > 0 THEN CAST(adv.ad_orders / adv.total_clicks AS FLOAT) ELSE 0 END',
                //     'cvr_oder',
                // )
                .addSelect('CASE WHEN adv.total_clicks > 0 THEN CAST(adv.ad_orders AS FLOAT) / adv.total_clicks ELSE 0 END', 'cvr_oder')
                // .addSelect(
                //     'CAST WHEN adv.total_clicks > 0 THEN CAST(coalesce(adv.ad_units,0) / coalesce(adv.total_clicks,0)  AS FLOAT) ELSE 0 END)',
                //     'cvr_unit',
                // )
                .addSelect('CASE WHEN adv.total_clicks > 0 THEN CAST(COALESCE(adv.ad_units, 0) AS FLOAT) / CAST(COALESCE(adv.total_clicks, 0) AS FLOAT) ELSE 0 END', 'cvr_unit')
                .addSelect('CAST(coalesce(wfs.wfs_amount,0) AS FLOAT)', 'total_wfs_amount')
                .addSelect('CAST(coalesce(dispute.dispute_amount,0) AS FLOAT)', 'total_dispute_amount')
                .addSelect('CAST(coalesce(commission.commission_amount,0) AS FLOAT)', 'total_commission_amount')
                .addSelect('CAST(coalesce(returnfees.return_amount,0) AS FLOAT)', 'total_return_amount')
                .addSelect('CAST(coalesce(shipping_fees.shipping_fees,0) AS FLOAT)', 'shipping_total')
                .addSelect('CAST(coalesce(cap.cap_amount,0) AS FLOAT)', 'cap_total')
                .addSelect('CAST(coalesce(sum(c.amount),0) AS FLOAT)', 'cogs_total')
                .addSelect('coalesce(return_unit.return_unit,0)', 'return_unit')
                /**
                 * Arthematic Calculation Query End Below
                 */
                .leftJoin('cogs', 'c', 'c.product_id = p.id')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('och.sku', 'sku')
                    .addSelect('CAST(COALESCE(SUM(och.product_amount), 0) AS FLOAT)', 'total_amount_sale')
                    .addSelect('CAST(COALESCE(count(och.order_line_number), 0) AS FLOAT)', 'order_line_number')
                    .from('orders', 'o')
                    .leftJoin('order_charges', 'och', 'och.order_id=o.id')
                    .where('och.charge_type = :charge_type', {
                    charge_type: 'PRODUCT',
                })
                    .andWhere('och.order_status != :order_status', {
                    order_status: 'Cancelled',
                })
                    .andWhere('o.formated_date BETWEEN :o_startDate AND :o_endDate', {
                    o_startDate: startDate.format('YYYY-MM-DD'),
                    o_endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('och.sku');
            }, 'oc', 'oc.sku = p.sku')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('adv_product.item_id', 'product_item_id')
                    .addSelect('a.item_id', 'adv_item_id')
                    .addSelect('CAST(coalesce(COUNT(a.item_id),0) AS FLOAT)', 'adv_count')
                    .addSelect('CAST(coalesce(SUM(a.ad_spend),0) AS FLOAT)', 'ad_spend')
                    .addSelect('CAST(coalesce(SUM(a.total_attributed_sales),0) AS FLOAT)', 'ad_sales')
                    .addSelect('CAST(coalesce(SUM(a.units_sold),0) AS FLOAT)', 'ad_units')
                    .addSelect('CAST(coalesce(SUM(a.orders),0) AS FLOAT)', 'ad_orders')
                    .addSelect('CAST(coalesce(SUM(a.impressions),0) AS FLOAT)', 'impressions')
                    .addSelect('CAST(coalesce(SUM(a.clicks),0) AS FLOAT)', 'total_clicks')
                    .addSelect('CAST(coalesce(SUM(a.orders),0) AS FLOAT)', 'orders')
                    .from('products', 'adv_product')
                    .innerJoin('advertisers', 'a', 'a.item_id = adv_product.item_id')
                    .where('a.store_id IN (:...storeId)', {
                    storeId: id,
                })
                    .andWhere('a.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate.format('YYYY-MM-DD'),
                    endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('adv_product.item_id,a.item_id');
            }, 'adv', 'adv.adv_item_id = p.item_id')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('rs_product.gtin', 'gtin')
                    .addSelect('rs.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(coalesce(SUM(rs.amount),0) AS FLOAT)', 'shipping_fees')
                    .from('products', 'rs_product') // Use 'rs_product' as the alias
                    .leftJoin('recon', 'rs', 'rs.partner_gtin = rs_product.gtin')
                    .where('rs.store_id IN (:...storeId)', {
                    storeId: id,
                })
                    .andWhere('rs.transaction_type = :shipping_transactionType', {
                    shipping_transactionType: 'Adjustment',
                })
                    .andWhere('rs.transaction_description = :shipping_transactionDescriptions', {
                    shipping_transactionDescriptions: 'Walmart Shipping Label Service Charge',
                })
                    .andWhere('rs.amount_type = :shipping_amountType', {
                    shipping_amountType: 'Fee/Reimbursement',
                })
                    .andWhere('rs.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                    startDate: startDate.format('YYYY-MM-DD'),
                    endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('rs_product.gtin,rs.partner_gtin');
            }, 'shipping_fees', 'shipping_fees.partner_gtin = p.gtin')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('rcap_product.gtin', 'gtin')
                    .addSelect('rcap.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(coalesce(SUM(rcap.amount),0) AS FLOAT)', 'cap_amount')
                    .from('products', 'rcap_product') // Use 'rcap_product' as the alias
                    .leftJoin('recon', 'rcap', 'rcap.partner_gtin = rcap_product.gtin')
                    .where('rcap.store_id IN (:...cap_storeId)', {
                    cap_storeId: id,
                })
                    .andWhere('rcap.amount_type = :cap_shipping_amountType', {
                    cap_shipping_amountType: 'Total Walmart Funded Savings',
                })
                    .andWhere('rcap.transaction_posted_timestamp BETWEEN :cap_startDate AND :cap_endDate', {
                    cap_startDate: startDate.format('YYYY-MM-DD'),
                    cap_endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('rcap_product.gtin,rcap.partner_gtin');
            }, 'cap', 'cap.partner_gtin = p.gtin')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('rc_product.gtin', 'gtin')
                    .addSelect('rc.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(coalesce(SUM(rc.amount),0) AS FLOAT)', 'commission_amount')
                    .from('products', 'rc_product') // Use 'rc_product' as the alias
                    .leftJoin('recon', 'rc', 'rc.partner_gtin = rc_product.gtin')
                    .where('rc.store_id IN (:...commission_storeId)', {
                    commission_storeId: id,
                })
                    .andWhere('rc.amount_type = :commission_shipping_amountType', {
                    commission_shipping_amountType: 'Commission on Product',
                })
                    .andWhere('rc.transaction_posted_timestamp BETWEEN :commission_startDate AND :commission_endDate', {
                    commission_startDate: startDate.format('YYYY-MM-DD'),
                    commission_endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('rc_product.gtin,rc.partner_gtin');
            }, 'commission', 'commission.partner_gtin = p.gtin')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('rdis_product.gtin', 'gtin')
                    .addSelect('rdis.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(coalesce(SUM(rdis.amount),0) AS FLOAT)', 'dispute_amount')
                    .from('products', 'rdis_product') // Use 'rdis_product' as the alias
                    .leftJoin('recon', 'rdis', 'rdis.partner_gtin = rdis_product.gtin')
                    .where('rdis.store_id IN (:...storeId)', {
                    storeId: id,
                })
                    .andWhere('rdis.transaction_type IN (:...dispute_transactionTypes)', {
                    dispute_transactionTypes: [
                        'Adjustment',
                        'Dispute Settlement',
                    ],
                })
                    .andWhere('rdis.transaction_description IN (:...dispute_transactionDescriptions)', {
                    dispute_transactionDescriptions: [
                        'Walmart Return Shipping Charge Reversal',
                        'Walmart Customer Care Refund Reversal',
                    ],
                })
                    .andWhere('rdis.amount_type = :dispute_amountType', {
                    dispute_amountType: 'Fee/Reimbursement',
                })
                    .andWhere('rdis.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                    startDate: startDate.format('YYYY-MM-DD'),
                    endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('rdis_product.gtin,rdis.partner_gtin');
            }, 'dispute', 'dispute.partner_gtin = p.gtin')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('rr_product.gtin', 'gtin')
                    .addSelect('rr.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(coalesce(SUM(rr.amount),0) AS FLOAT)', 'return_amount')
                    .from('products', 'rr_product') // Use 'rr_product' as the alias
                    .leftJoin('recon', 'rr', 'rr.partner_gtin = rr_product.gtin')
                    .where('rr.store_id IN (:...storeId)', {
                    storeId: id,
                })
                    .andWhere('rr.transaction_type IN (:...returnTransactionTypes)', {
                    returnTransactionTypes: ['Refund'],
                })
                    .andWhere('rr.transaction_description IN (:...returnTransactionDescriptions)', {
                    returnTransactionDescriptions: [
                        'Return Refund',
                        'Keep-it refund',
                    ],
                })
                    .andWhere('rr.amount_type IN (:...returnAmountTypes)', {
                    returnAmountTypes: ['Product Price'],
                })
                    .andWhere('rr.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                    startDate: startDate.format('YYYY-MM-DD'),
                    endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('rr_product.gtin,rr.partner_gtin');
            }, 'returnfees', 'returnfees.partner_gtin = p.gtin')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('rwfs_product.gtin', 'gtin')
                    .addSelect('wfs.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(coalesce(SUM(wfs.amount),0) AS FLOAT)', 'wfs_amount')
                    .from('products', 'rwfs_product') // Use 'rwfs_product' as the alias
                    .leftJoin('recon', 'wfs', 'wfs.partner_gtin = rwfs_product.gtin')
                    .where('wfs.store_id IN (:...storeId)', {
                    storeId: id,
                })
                    .andWhere('wfs.transaction_type IN (:...transactionTypes)', {
                    transactionTypes: ['Adjustment', 'Service Fee'],
                })
                    .andWhere('wfs.transaction_description IN (:...transactionDescriptions)', {
                    transactionDescriptions: [
                        'WFS Fulfillment fee',
                        '"WFS Return Shipping fee "',
                        'Walmart Return Shipping Charge',
                    ],
                })
                    .andWhere('wfs.amount_type IN (:...amountTypes)', {
                    amountTypes: ['Fee/Reimbursement', 'Item Fees'],
                })
                    .andWhere('wfs.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
                    startDate: startDate.format('YYYY-MM-DD'),
                    endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('rwfs_product.gtin,wfs.partner_gtin');
            }, 'wfs', 'wfs.partner_gtin = p.gtin')
                .leftJoin((subQuery) => {
                return subQuery
                    .select('ru_product.gtin', 'gtin')
                    .addSelect('ru.partner_gtin', 'partner_gtin')
                    .addSelect('CAST(COUNT(ru.id) AS FLOAT)', 'return_unit')
                    .from('products', 'ru_product') // Use 'ru_product' as the alias
                    .leftJoin('recon', 'ru', 'ru.partner_gtin = ru_product.gtin')
                    .where('ru.store_id IN (:...storeId)', {
                    storeId: id,
                })
                    .andWhere('ru.transaction_type IN (:...ru_transactionTypes)', {
                    ru_transactionTypes: ['Refund'],
                })
                    .andWhere('ru.amount_type IN (:...ru_amountTypes)', {
                    ru_amountTypes: ['Product Price'],
                })
                    .andWhere('ru.transaction_posted_timestamp BETWEEN :ru_startDate AND :ru_endDate', {
                    ru_startDate: startDate.format('YYYY-MM-DD'),
                    ru_endDate: endDate.format('YYYY-MM-DD'),
                })
                    .groupBy('ru_product.gtin,ru.partner_gtin');
            }, 'return_unit', 'return_unit.partner_gtin = p.gtin')
                .where('p.store_id IN (:...storeId)', {
                storeId: id,
            });
            if (filter !== null && filter.action === 'sort') {
                queryBuilder.orderBy(filter.name, filter.direction.toUpperCase());
            }
            // .groupBy(
            //     `p.sku,
            //     p.id,
            //     p.item_id,
            //     p.product_name,
            //     p.gtin,
            //     p.item_page_url,
            //     p.primary_image_url,
            //     p.price,
            //     oc.total_amount_sale,
            //     oc.order_line_number
            //     `,
            // )
            const data = yield queryBuilder
                .groupBy(`p.sku,
                p.id,
                p.item_id,
                p.product_name,
                p.gtin,
                p.item_page_url,
                p.primary_image_url,
                p.price,
                oc.total_amount_sale,
                adv.adv_count,
                adv.ad_spend,
                adv.ad_sales,
                adv.ad_units,
                adv.ad_orders,
                adv.impressions,
                adv.total_clicks,
                adv.orders,
                oc.order_line_number,
                shipping_fees.shipping_fees,
                cap.cap_amount,
                wfs.wfs_amount,
                commission.commission_amount,
                returnfees.return_amount,
                dispute.dispute_amount,
                return_unit.return_unit
                `)
                // .orderBy('p.id')
                .getRawMany();
            return data;
        });
    }
    accountLevelFeesForGraph(schema_name, id, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const dateQuery = `SELECT TO_CHAR(generate_series('${startDate}'::date, '${endDate}'::date, '1 day'::interval), 'YYYY-MM-DD') AS date`;
            const dateResults = yield (yield this.publicConnection()).query(dateQuery);
            const inboundTransportationFeeQuery = `select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                            (
            select
                r.transaction_posted_timestamp as date,
                COALESCE(SUM(r.amount), 0) as total_amount
            from
                ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS InboundTransportationFee'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc`;
            const inboundTransportationFeeResult = yield (yield this.publicConnection()).query(inboundTransportationFeeQuery);
            const storageFeeQuery = `
        select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                            (
            select
                r.transaction_posted_timestamp as date,
                COALESCE(SUM(r.amount), 0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS StorageFee'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc
        `;
            const storageFeesResult = yield (yield this.publicConnection()).query(storageFeeQuery);
            const lostInventoryQuery = `select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                            (
            select
                r.transaction_posted_timestamp as date,
                COALESCE(SUM(r.amount), 0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS LostInventory'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc`;
            const lostInventoryFeesResult = yield (yield this.publicConnection()).query(lostInventoryQuery);
            const foundInvetoryQuery = `
            select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                            (
            select
                r.transaction_posted_timestamp as date,
                COALESCE(SUM(r.amount), 0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS FoundInventory'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc
        `;
            const foundInventoryFeesResult = yield (yield this.publicConnection()).query(foundInvetoryQuery);
            const refundQuery = `
            select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                            (
            select
                r.transaction_posted_timestamp as date,
                COALESCE(SUM(r.amount), 0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS Refund'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc
        `;
            const refundFeesResult = yield (yield this.publicConnection()).query(refundQuery);
            const damageInWarehouseQuery = `
        select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
            (
            select
                r.transaction_posted_timestamp as date,
                coalesce(SUM(r.amount),0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS DamageInWarehouse'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by
                r.transaction_posted_timestamp) as subquery
        on
            gs.date = subquery.date
        group by
            gs.date
        order by
            gs.date asc
        `;
            const damageInWarehouseResult = yield (yield this.publicConnection()).query(damageInWarehouseQuery);
            const rc_InventoryDisposalFeeQuery = `
            select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,
                cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
            from
                (
                select
                    generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
            left join
                                (
                select
                    r.transaction_posted_timestamp as date,
                    coalesce(SUM(r.amount),0) as total_amount
                from
                ${schema_name}.recon r
                where
                    r.store_id in (${id})
                    and r.transaction_description = 'WFS RC_InventoryDisposalFee'
                    and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
                group by
                    r.transaction_posted_timestamp) as subquery
            on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc
        `;
            const rc_InventoryDisposalFeeResult = yield (yield this.publicConnection()).query(rc_InventoryDisposalFeeQuery);
            const prepServiceFeeQuery = `
            select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,
                cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
            from
                (
                select
                    generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
            left join
                                (
                select
                    r.transaction_posted_timestamp as date,
                    coalesce(SUM(r.amount),0) as total_amount
                from
                ${schema_name}.recon r
                where
                    r.store_id in (${id})
                    and r.transaction_description = 'WFS PrepServiceFee'
                    and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
                group by
                    r.transaction_posted_timestamp) as subquery
            on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc
        `;
            const prepServiceFeeResult = yield (yield this.publicConnection()).query(prepServiceFeeQuery);
            const inventoryTransferFeeQuery = `
            select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                            (
            select
                r.transaction_posted_timestamp as date,
                coalesce(SUM(r.amount),0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS InventoryTransferFee'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by
                r.transaction_posted_timestamp) as subquery
        on
            gs.date = subquery.date
        group by
            gs.date
        order by
            gs.date asc
        `;
            const inventoryTransferFeeResult = yield (yield this.publicConnection()).query(inventoryTransferFeeQuery);
            const rc_InventoryRTVFeeQuery = `
            select
            TO_CHAR(gs.date,'YYYY-MM-DD') as date,
            cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
        from
            (
            select
                generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
        left join
                                        (
            select
                r.transaction_posted_timestamp as date,
                coalesce(SUM(r.amount),
                0) as total_amount
            from
            ${schema_name}.recon r
            where
                r.store_id in (${id})
                and r.transaction_description = 'WFS RC_InventoryRTVFee'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by
                r.transaction_posted_timestamp) as subquery
                    on
            gs.date = subquery.date
        group by
            gs.date
        order by
            gs.date asc
        `;
            const rc_InventoryRTVFeeResult = yield (yield this.publicConnection()).query(rc_InventoryRTVFeeQuery);
            const ad_logoQuery = `
            select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,
                cast(coalesce(SUM(subquery.total_ad_spend),0) as FLOAT) as total_ad_spend
            from
                (
                select
                    generate_series('${startDate}'::date,'${endDate}'::date,'1 day'::interval) as date) as gs
            left join
                                            (
                select
                    a.date as date,
                    sum(a.ad_spend) as total_ad_spend
                from
                ${schema_name}.advertisers a
                where
                    a.store_id in (${id})
                    and a.item_name = 'Logo'
                    and a.date between '${startDate}' and '${endDate}'
                group by
                    a.date) as subquery
                        on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc
        `;
            const ad_logoResult = yield (yield this.publicConnection()).query(ad_logoQuery);
            const reviewAcceleratorQuery = `
            select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,
                cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
            from
                (
                select
                    generate_series('${startDate}'::date,'${endDate}'::date,
                    '1 day'::interval) as date) as gs
            left join
                                            (
                select
                    r.transaction_posted_timestamp as date,
                    coalesce(SUM(r.amount),
                    0) as total_amount
                from
                ${schema_name}.recon r
                where
                    r.store_id in (${id})
                    and r.transaction_description = 'Review Accelerator'
                    and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
                group by
                    r.transaction_posted_timestamp) as subquery
                        on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc
        `;
            const reviewAcceleratorResult = yield (yield this.publicConnection()).query(reviewAcceleratorQuery);
            const WFSInventoryRemovalOrderQuery = `
            select
                TO_CHAR(gs.date,'YYYY-MM-DD') as date,
                cast(coalesce(SUM(subquery.total_amount),0) as FLOAT) as total_amount
            from
                (
                select
                    generate_series('${startDate}'::date,'${endDate}'::date,
                    '1 day'::interval) as date) as gs
            left join
                                            (
                select
                    r.transaction_posted_timestamp as date,
                    coalesce(SUM(r.amount),
                    0) as total_amount
                from
                ${schema_name}.recon r
                where
                    r.store_id in (${id})
                    and r.transaction_description = 'WFS InventoryRemovalOrder'
                    and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
                group by
                    r.transaction_posted_timestamp) as subquery
                        on
                gs.date = subquery.date
            group by
                gs.date
            order by
                gs.date asc
        `;
            const WFSInventoryRemovalOrderResult = yield (yield this.publicConnection()).query(WFSInventoryRemovalOrderQuery);
            const accountLevelFeesByDate = dateResults.map((date) => {
                const matchingInBoundRecords = inboundTransportationFeeResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingStorageFees = storageFeesResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingLostInventoryFees = lostInventoryFeesResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingFoundInventoryFees = foundInventoryFeesResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingRefundFees = refundFeesResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingDamageInWarehouse = damageInWarehouseResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingRC_InventoryDisposalFee = rc_InventoryDisposalFeeResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingPrepServiceFee = prepServiceFeeResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingInventoryTransferFee = inventoryTransferFeeResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingRC_InventoryRTVFee = rc_InventoryRTVFeeResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingReviewAccelerator = reviewAcceleratorResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingWFSInventoryRemovalOrder = WFSInventoryRemovalOrderResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_amount;
                });
                const matchingAd_logo = ad_logoResult.find((data) => {
                    if (data.date === date.date)
                        return data.total_ad_spend;
                });
                const inBoundRecords = matchingInBoundRecords === undefined
                    ? 0
                    : matchingInBoundRecords.total_amount;
                const storageFees = matchingStorageFees === undefined
                    ? 0
                    : matchingStorageFees.total_amount;
                const lostInventoryFees = matchingLostInventoryFees === undefined
                    ? 0
                    : matchingLostInventoryFees.total_amount;
                const foundInventoryFees = matchingFoundInventoryFees === undefined
                    ? 0
                    : matchingFoundInventoryFees.total_amount;
                const refundFees = matchingRefundFees === undefined
                    ? 0
                    : matchingRefundFees.total_amount;
                const damageInWarehouse = matchingDamageInWarehouse === undefined
                    ? 0
                    : matchingDamageInWarehouse.total_amount;
                const rc_InventoryDisposalFee = matchingRC_InventoryDisposalFee === undefined
                    ? 0
                    : matchingRC_InventoryDisposalFee.total_amount;
                const prepServiceFee = matchingPrepServiceFee === undefined
                    ? 0
                    : matchingPrepServiceFee.total_amount;
                const inventoryTransferFee = matchingInventoryTransferFee === undefined
                    ? 0
                    : matchingInventoryTransferFee.total_amount;
                const rc_InventoryRTVFee = matchingRC_InventoryRTVFee === undefined
                    ? 0
                    : matchingRC_InventoryRTVFee.total_amount;
                const reviewAccelerator = matchingReviewAccelerator === undefined
                    ? 0
                    : matchingReviewAccelerator.total_amount;
                const wfsInventoryRemovalOrder = matchingWFSInventoryRemovalOrder === undefined
                    ? 0
                    : matchingWFSInventoryRemovalOrder.total_amount;
                const ad_logo = matchingAd_logo === undefined
                    ? 0
                    : matchingAd_logo.total_ad_spend;
                const totalAccountLevelFees = Math.abs(inBoundRecords) +
                    Math.abs(storageFees) +
                    Math.abs(lostInventoryFees) +
                    Math.abs(foundInventoryFees) +
                    Math.abs(refundFees) +
                    Math.abs(damageInWarehouse) +
                    Math.abs(rc_InventoryDisposalFee) +
                    Math.abs(prepServiceFee) +
                    Math.abs(inventoryTransferFee) +
                    Math.abs(rc_InventoryRTVFee) +
                    Math.abs(reviewAccelerator) +
                    Math.abs(wfsInventoryRemovalOrder) +
                    Math.abs(ad_logo);
                return {
                    date: date.date,
                    totalAccountLevelFees: totalAccountLevelFees,
                };
            });
            (yield this.publicConnection()).destroy();
            return accountLevelFeesByDate;
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
], PNLDashboardController.prototype, "index", null);
__decorate([
    (0, routing_controllers_1.Post)('/pnl-by-item'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PNLDashboardController.prototype, "pnlByItem", null);
PNLDashboardController = __decorate([
    (0, routing_controllers_1.JsonController)('/pnl-dashboard'),
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], PNLDashboardController);
exports.PNLDashboardController = PNLDashboardController;
//# sourceMappingURL=PNLDashboardController.js.map