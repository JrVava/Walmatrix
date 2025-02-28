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
exports.ExportProductController = void 0;
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
const Index_1 = require("../entity/Index");
const loggingMiddleware_1 = require("../service/loggingMiddleware");
const json2csv_1 = __importDefault(require("json2csv"));
const moment_1 = __importDefault(require("moment"));
const utils_1 = require("../modules/utils");
const helper_1 = require("../helper/helper");
let ExportProductController = class ExportProductController extends connection_1.DataSourceConnection {
    getProducts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // req.headers['email'] = 'yash.kanhasoft@gmail.com';
            const email = String(req.header('email'));
            const usersRepository = (yield this.publicConnection()).getRepository(Index_1.Users);
            const getUserData = yield usersRepository.findOne({
                where: {
                    email: email,
                },
            });
            const productsRepository = (yield this.connection(getUserData.store_name)).getRepository(Index_1.Products);
            const product = yield productsRepository
                .createQueryBuilder('product')
                .select('product.sku')
                .addSelect('product.item_id')
                .addSelect('product.gtin')
                .addSelect('cogs.amount', 'cogs_amount')
                .leftJoin('cogs', 'cogs', 'cogs.product_id = product.id')
                .getRawMany();
            if (product) {
                const csvFileName = 'output.csv';
                const headerOfFile = ['SKU', 'GTIN', 'Item Id', 'CoGs'];
                // const csv = json2csv.parse(product, { header });
                const header = false;
                const fileData = [];
                product.forEach((record) => {
                    const cogs = record.cogs_amount === null ? 0 : record.cogs_amount;
                    fileData.push({
                        sku: record.product_sku,
                        gtin: record.product_gtin,
                        item_id: record.product_item_id,
                        cogs: cogs,
                    });
                });
                const csv = json2csv_1.default.parse(fileData, { header });
                const csvWithCustomHeaders = [headerOfFile.join(','), csv].join('\n');
                // Convert the JSON data to CSV format
                // res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-disposition', `attachment; filename=${csvFileName}`);
                return res.send(csvWithCustomHeaders);
            }
            else {
                return res.status(404).send({ message: 'Products does not found' });
            }
        });
    }
    exportPNLByItem(dataObj, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startDate, endDate, selectedMetrix, store_id } = dataObj;
            const start = (0, moment_1.default)(startDate);
            const end = (0, moment_1.default)(endDate);
            const getSchema = yield (0, helper_1.findSchemaNameWithArray)(store_id);
            const metricToRemove = 'Product';
            // Use the filter method to create a new array without the specified metric
            const filteredMetrix = selectedMetrix.filter((metric) => metric !== metricToRemove);
            const schema_name = getSchema.schemaName;
            const productRepository = (yield this.connection(schema_name)).getRepository(Index_1.Products);
            const csvFileName = 'pnl-by-item.csv';
            const headerOfFile = ['SKU', 'Name', 'Item Id', 'Product URL'];
            const header = false;
            const fileData = [];
            // const products = await this.getPNLByItem(
            //     store_id,
            //     start,
            //     end,
            //     schema_name,
            // );
            const products = yield (0, utils_1.getPnlByItem)(productRepository, start, end, store_id);
            /**
             * Conditional Header Code Start Below
             */
            if (filteredMetrix) {
                filteredMetrix.map((headerMetrix) => {
                    headerOfFile.push(headerMetrix);
                });
            }
            /**
             * Conditional Header Code End
             */
            products.map((product) => {
                const productObject = {
                    sku: product.sku,
                    name: product.product_name,
                    item_id: product.item_id,
                    product_url: product.product_url,
                };
                selectedMetrix.forEach((headerMetrix) => {
                    const pnl_formula = (product === null || product === void 0 ? void 0 : product.total_amount_sale) +
                        (product === null || product === void 0 ? void 0 : product.cap_total) -
                        Math.abs(product === null || product === void 0 ? void 0 : product.total_return_amount) -
                        Math.abs(product === null || product === void 0 ? void 0 : product.total_commission_amount) -
                        Math.abs(product === null || product === void 0 ? void 0 : product.total_wfs_amount) -
                        (product === null || product === void 0 ? void 0 : product.ad_spend) -
                        (product === null || product === void 0 ? void 0 : product.cogs_total) +
                        Math.abs(product === null || product === void 0 ? void 0 : product.total_dispute_amount) -
                        Math.abs(product === null || product === void 0 ? void 0 : product.shipping_total);
                    switch (headerMetrix) {
                        case 'Average Price':
                            productObject['Average Price'] =
                                product.average_price.toFixed(2);
                            break;
                        case 'GTIN':
                            productObject['GTIN'] = product.gtin;
                            break;
                        case 'Ad Sales':
                            productObject['Ad Sales'] = product.ad_sales
                                ? product.ad_sales.toFixed(2)
                                : 0;
                            break;
                        case 'Sales':
                            productObject['Sales'] = product.total_amount_sale
                                ? product.total_amount_sale.toFixed(2)
                                : 0;
                            break;
                        case 'Ad Spend':
                            productObject['Ad Spend'] = product.ad_spend
                                ? product.ad_spend.toFixed(2)
                                : 0;
                            break;
                        case 'Commission':
                            productObject['Commission'] =
                                product.total_commission_amount
                                    ? product.total_commission_amount.toFixed(2)
                                    : 0;
                            break;
                        case 'Dispute':
                            productObject['Dispute'] = product.total_dispute_amount
                                ? product.total_dispute_amount.toFixed(2)
                                : 0;
                            break;
                        case 'Returns':
                            productObject['Returns'] = product.total_return_amount
                                ? product.total_return_amount.toFixed(2)
                                : 0;
                            break;
                        case 'WFS Fees':
                            productObject['WFS Fees'] = product.total_wfs_amount
                                ? product.total_wfs_amount.toFixed(2)
                                : 0;
                            break;
                        case 'CoGS':
                            productObject['CoGS'] = product.cogs_total
                                ? product.cogs_total.toFixed(2)
                                : 0;
                            break;
                        case 'CAP':
                            productObject['CAP'] = product.cap_total
                                ? product.cap_total.toFixed(2)
                                : 0;
                            break;
                        case 'Ad Units':
                            productObject['Ad Units'] = product.ad_units
                                ? product.ad_units
                                : 0;
                            break;
                        case 'Ad Orders':
                            productObject['Ad Orders'] = product.adv_orders
                                ? product.adv_orders
                                : 0;
                            break;
                        case 'Organic Sales':
                            productObject['Organic Sales'] = product.organic_sales
                                ? product.organic_sales.toFixed(2)
                                : 0;
                            break;
                        case 'Organic Sales %':
                            productObject['Organic Sales %'] =
                                product.organic_sales_percentage
                                    ? product.organic_sales_percentage.toFixed(2) *
                                        100
                                    : 0;
                            break;
                        case 'RoAS':
                            productObject['RoAS'] = product.roas
                                ? product.roas.toFixed(2)
                                : 0;
                            break;
                        case 'TRoAS':
                            productObject['TRoAS'] = product.troas
                                ? product.troas.toFixed(2)
                                : 0;
                            break;
                        case 'ACoS':
                            productObject['ACoS'] = product.acos
                                ? (product.acos * 100).toFixed(2)
                                : 0;
                            break;
                        case 'TACoS':
                            productObject['TACoS'] = product.tacos
                                ? (product.tacos * 100).toFixed(2)
                                : 0;
                            break;
                        case 'Impressions':
                            productObject['Impressions'] = product.impressions
                                ? product.impressions
                                : 0;
                            break;
                        case 'Clicks':
                            productObject['Clicks'] = product.total_clicks
                                ? product.total_clicks
                                : 0;
                            break;
                        case 'CTR':
                            productObject['CTR'] = product.ctr ? product.ctr : 0;
                            break;
                        case 'CVR (Orders)':
                            productObject['CVR (Orders)'] = product.cvr_oder
                                ? product.cvr_oder
                                : 0;
                            break;
                        case 'CVR (Units)':
                            productObject['CVR (Units)'] = product.cvr_unit
                                ? product.cvr_unit.toFixed(2)
                                : 0;
                            break;
                        case 'Units Sold':
                            productObject['Units Sold'] = product.units_sold
                                ? product.units_sold
                                : 0;
                            break;
                        case 'Current Price':
                            productObject['Current Price'] = product.product_price
                                ? product.product_price.toFixed(2)
                                : 0;
                            break;
                        case 'Returned Units':
                            productObject['Returned Units'] = product.return_unit
                                ? product.return_unit
                                : 0;
                            break;
                        case 'Shipping Fees':
                            productObject['Shipping Fees'] = product.shipping_total
                                ? product.shipping_total.toFixed(2)
                                : 0;
                            break;
                        case 'Profit Margin %':
                            productObject['Profit Margin %'] =
                                (product === null || product === void 0 ? void 0 : product.total_amount_sale)
                                    ? ((pnl_formula /
                                        (product === null || product === void 0 ? void 0 : product.total_amount_sale)) *
                                        100).toFixed(2)
                                    : 0;
                            break;
                        case 'Total Pnl':
                            productObject['Total Pnl'] = pnl_formula
                                ? pnl_formula.toFixed(2)
                                : 0;
                            break;
                    }
                });
                fileData.push(productObject);
            });
            const csv = json2csv_1.default.parse(fileData, { header });
            const csvWithCustomHeaders = [headerOfFile.join(','), csv].join('\n');
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-disposition', `attachment; filename=${csvFileName}`);
            return res.send(csvWithCustomHeaders);
        });
    }
    getPNLByItem(store_id, startDate, endDate, schema_name) {
        return __awaiter(this, void 0, void 0, function* () {
            const productRepository = (yield this.connection(schema_name)).getRepository(Index_1.Products);
            const products = yield productRepository
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
                 * Arthematic Calculation Query Start Below
                 */
                .addSelect('CAST(coalesce(SUM(oc.total_amount_sale) - adv.ad_sales,0) AS FLOAT)', 'organic_sales')
                .addSelect(`
            CASE
            WHEN coalesce(SUM(oc.total_amount_sale), 0) = 0 THEN 0
            ELSE (coalesce(SUM(oc.total_amount_sale), 0) - coalesce(adv.ad_sales, 0)) / coalesce(SUM(oc.total_amount_sale), 0)
            END
            AS organic_sales_percentage
        `)
                .addSelect('CAST(CASE WHEN adv.ad_spend > 0 THEN CAST(adv.ad_sales / adv.ad_spend AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'roas')
                .addSelect('CAST(CASE WHEN adv.ad_spend > 0 THEN CAST(coalesce(SUM(oc.total_amount_sale),0) / coalesce(adv.ad_spend,0)  AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'troas')
                .addSelect('CAST(CASE WHEN adv.ad_sales > 0 THEN CAST(adv.ad_spend / adv.ad_sales AS DECIMAL(10, 2)) * 100 ELSE 0 END AS FLOAT)', 'acos')
                .addSelect('CASE WHEN adv.ad_sales > 0 THEN CAST((adv.ad_spend / adv.ad_sales) AS FLOAT) ELSE 0 END', 'acos')
                .addSelect('COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(adv.ad_spend / SUM(oc.total_amount_sale) AS FLOAT) ELSE 0 END)', 'tacos')
                .addSelect('CAST(coalesce(adv.total_clicks,0) AS FLOAT)', 'total_clicks')
                .addSelect('CAST(CASE WHEN adv.impressions > 0 THEN CAST(adv.total_clicks / adv.impressions AS DECIMAL(10, 2)) * 100 ELSE 0 END AS FLOAT)', 'ctr')
                .addSelect('CAST(CASE WHEN adv.total_clicks > 0 THEN CAST(adv.ad_orders / adv.total_clicks AS DECIMAL(10, 2)) * 100 ELSE 0 END AS FLOAT)', 'cvr_oder')
                .addSelect('CAST(CASE WHEN adv.total_clicks > 0 THEN CAST(coalesce(adv.ad_units,0) / coalesce(adv.total_clicks,0) * 100 AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'cvr_unit')
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
                    o_startDate: startDate,
                    o_endDate: endDate,
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
                    .where('a.store_id = :storeId', {
                    storeId: store_id,
                })
                    .andWhere('a.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
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
                    .where('rs.store_id = :storeId', {
                    storeId: store_id,
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
                    startDate: startDate,
                    endDate: endDate,
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
                    .where('rcap.store_id = :cap_storeId', {
                    cap_storeId: store_id,
                })
                    .andWhere('rcap.amount_type = :cap_shipping_amountType', {
                    cap_shipping_amountType: 'Total Walmart Funded Savings',
                })
                    .andWhere('rcap.transaction_posted_timestamp BETWEEN :cap_startDate AND :cap_endDate', {
                    cap_startDate: startDate,
                    cap_endDate: endDate,
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
                    .where('rc.store_id = :commission_storeId', {
                    commission_storeId: store_id,
                })
                    .andWhere('rc.amount_type = :commission_shipping_amountType', {
                    commission_shipping_amountType: 'Commission on Product',
                })
                    .andWhere('rc.transaction_posted_timestamp BETWEEN :commission_startDate AND :commission_endDate', {
                    commission_startDate: startDate,
                    commission_endDate: endDate,
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
                    .where('rdis.store_id = :storeId', {
                    storeId: store_id,
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
                    startDate: startDate,
                    endDate: endDate,
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
                    .where('rr.store_id = :storeId', {
                    storeId: store_id,
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
                    startDate: startDate,
                    endDate: endDate,
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
                    .where('wfs.store_id = :storeId', {
                    storeId: store_id,
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
                    startDate: startDate,
                    endDate: endDate,
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
                    .where('ru.store_id = :storeId', {
                    storeId: store_id,
                })
                    .andWhere('ru.transaction_type IN (:...ru_transactionTypes)', {
                    ru_transactionTypes: ['Refund'],
                })
                    .andWhere('ru.amount_type IN (:...ru_amountTypes)', {
                    ru_amountTypes: ['Product Price'],
                })
                    .andWhere('ru.transaction_posted_timestamp BETWEEN :ru_startDate AND :ru_endDate', {
                    ru_startDate: startDate,
                    ru_endDate: endDate,
                })
                    .groupBy('ru_product.gtin,ru.partner_gtin');
            }, 'return_unit', 'return_unit.partner_gtin = p.gtin')
                .where('p.store_id  = :storeId', {
                storeId: store_id,
            })
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
                .orderBy('p.id')
                .getRawMany();
            return products;
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/'),
    __param(0, (0, routing_controllers_1.Req)()),
    __param(1, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExportProductController.prototype, "getProducts", null);
__decorate([
    (0, routing_controllers_1.Post)('/export-pnl-by-item'),
    __param(0, (0, routing_controllers_1.Body)()),
    __param(1, (0, routing_controllers_1.Req)()),
    __param(2, (0, routing_controllers_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExportProductController.prototype, "exportPNLByItem", null);
ExportProductController = __decorate([
    (0, routing_controllers_1.JsonController)('/export-products')
    //@Controller('/export-products')
    ,
    (0, routing_controllers_1.UseBefore)(loggingMiddleware_1.loggingMiddleware)
], ExportProductController);
exports.ExportProductController = ExportProductController;
//# sourceMappingURL=ExportProduct.js.map