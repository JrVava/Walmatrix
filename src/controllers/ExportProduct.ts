import {
    Body,
    Get,
    JsonController,
    Post,
    Req,
    Res,
    UseBefore,
} from 'routing-controllers';
import { DataSourceConnection } from '../connection';
import { Users, Products } from '../entity/Index';
import { Request, Response } from 'express';
import { loggingMiddleware } from '../service/loggingMiddleware';
import json2csv from 'json2csv';
import moment from 'moment';
import { getPnlByItem } from '../modules/utils';
import { findSchemaNameWithArray } from '../helper/helper';

@JsonController('/export-products')
//@Controller('/export-products')
@UseBefore(loggingMiddleware)
export class ExportProductController extends DataSourceConnection {
    @Get('/')
    async getProducts(@Req() req: Request, @Res() res: Response) {
        // req.headers['email'] = 'yash.kanhasoft@gmail.com';
        const email = String(req.header('email'));
        const publicConnection = await this.publicConnection();
        const usersRepository = publicConnection.getRepository(Users);
        const getUserData = await usersRepository.findOne({
            where: {
                email: email,
            },
        });
        const productsRepository = (
            await this.connection(getUserData.store_name)
        ).getRepository(Products);

        const product = await productsRepository
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
                const cogs =
                    record.cogs_amount === null ? 0 : record.cogs_amount;

                fileData.push({
                    sku: record.product_sku,
                    gtin: record.product_gtin,
                    item_id: record.product_item_id,
                    cogs: cogs,
                });
            });
            const csv = json2csv.parse(fileData, { header });
            const csvWithCustomHeaders = [headerOfFile.join(','), csv].join(
                '\n',
            );

            // Convert the JSON data to CSV format
            // res.setHeader('Content-Type', 'text/csv');

            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader(
                'Content-disposition',
                `attachment; filename=${csvFileName}`,
            );
            return res.send(csvWithCustomHeaders);
        } else {
            return res.status(404).send({ message: 'Products does not found' });
        }
    }

    @Post('/export-pnl-by-item')
    async exportPNLByItem(
        @Body() dataObj,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const { startDate, endDate, selectedMetrix, store_id } = dataObj;

        const start = moment(startDate);
        const end = moment(endDate);

        const getSchema = await findSchemaNameWithArray(store_id);

        const metricToRemove = 'Product';

        // Use the filter method to create a new array without the specified metric
        const filteredMetrix = selectedMetrix.filter(
            (metric) => metric !== metricToRemove,
        );

        const schema_name = getSchema.schemaName;

        const productRepository = (
            await this.connection(schema_name)
        ).getRepository(Products);

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
        const products = await getPnlByItem(
            productRepository,
            start,
            end,
            store_id,
        );
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
                const pnl_formula =
                    product?.total_amount_sale +
                    product?.cap_total -
                    Math.abs(product?.total_return_amount) -
                    Math.abs(product?.total_commission_amount) -
                    Math.abs(product?.total_wfs_amount) -
                    product?.ad_spend -
                    product?.cogs_total +
                    Math.abs(product?.total_dispute_amount) -
                    Math.abs(product?.shipping_total);
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
                            ? product.ad_sales
                            : 0;
                        break;
                    case 'Sales':
                        productObject['Sales'] = product.total_amount_sale
                            ? product.total_amount_sale
                            : 0;
                        break;
                    case 'Ad Spend':
                        productObject['Ad Spend'] = product.ad_spend
                            ? product.ad_spend
                            : 0;
                        break;
                    case 'Commission':
                        productObject['Commission'] =
                            product.total_commission_amount
                                ? product.total_commission_amount
                                : 0;
                        break;
                    case 'Dispute':
                        productObject['Dispute'] = product.total_dispute_amount
                            ? product.total_dispute_amount
                            : 0;
                        break;
                    case 'Returns':
                        productObject['Returns'] = product.total_return_amount
                            ? product.total_return_amount
                            : 0;
                        break;
                    case 'WFS Fees':
                        productObject['WFS Fees'] = product.total_wfs_amount
                            ? product.total_wfs_amount
                            : 0;
                        break;
                    case 'CoGS':
                        productObject['CoGS'] = product.cogs_total
                            ? product.cogs_total
                            : 0;
                        break;
                    case 'CAP':
                        productObject['CAP'] = product.cap_total
                            ? product.cap_total
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
                            ? product.organic_sales
                            : 0;
                        break;
                    case 'Organic Sales %':
                        productObject['Organic Sales %'] =
                            product.organic_sales_percentage
                                ? product.organic_sales_percentage * 100
                                : 0;
                        break;
                    case 'RoAS':
                        productObject['RoAS'] = product.roas ? product.roas : 0;
                        break;
                    case 'TRoAS':
                        productObject['TRoAS'] = product.troas
                            ? product.troas
                            : 0;
                        break;
                    case 'ACoS':
                        productObject['ACoS'] = product.acos
                            ? product.acos * 100
                            : 0;
                        break;
                    case 'TACoS':
                        productObject['TACoS'] = product.tacos
                            ? product.tacos * 100
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
                        productObject['CTR'] = product.ctr
                            ? product.ctr * 100
                            : 0;
                        break;
                    case 'CVR (Orders)':
                        productObject['CVR (Orders)'] = product.cvr_oder
                            ? product.cvr_oder * 100
                            : 0;
                        break;
                    case 'CVR (Units)':
                        productObject['CVR (Units)'] = product.cvr_unit
                            ? product.cvr_unit * 100
                            : 0;
                        break;
                    case 'Units Sold':
                        productObject['Units Sold'] = product.units_sold
                            ? product.units_sold
                            : 0;
                        break;
                    case 'Current Price':
                        productObject['Current Price'] = product.product_price
                            ? product.product_price
                            : 0;
                        break;
                    case 'Returned Units':
                        productObject['Returned Units'] = product.return_unit
                            ? product.return_unit
                            : 0;
                        break;
                    case 'Shipping Fees':
                        productObject['Shipping Fees'] = product.shipping_total
                            ? product.shipping_total
                            : 0;
                        break;
                    case 'Profit Margin %':
                        productObject['Profit Margin %'] =
                            product?.total_amount_sale
                                ? (
                                      (pnl_formula /
                                          product?.total_amount_sale) *
                                      100
                                  ).toFixed(2)
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

        const csv = json2csv.parse(fileData, { header });
        const csvWithCustomHeaders = [headerOfFile.join(','), csv].join('\n');
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader(
            'Content-disposition',
            `attachment; filename=${csvFileName}`,
        );
        return res.send(csvWithCustomHeaders);
    }
}
