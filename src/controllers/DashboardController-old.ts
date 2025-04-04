import {
    Body,
    JsonController,
    Post,
    Res,
    UseBefore,
} from 'routing-controllers';
import { DataSourceConnection } from '../connection';
import {
    Advertisers,
    StoreConfig,
    Orders,
    OrderCharges,
    Recon,
} from '../entity/Index';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { Response } from 'express';
import moment from 'moment';

// import { Between } from "typeorm";

@JsonController('/old-dashboard')
@UseBefore(loggingMiddleware)
export class DashboardController extends DataSourceConnection {
    @Post('/')
    async index(@Body() dataObj, @Res() res: Response) {
        const id = dataObj.store_id;
        const metricsFilterType = dataObj.metricsFilterType
            ? dataObj.metricsFilterType
            : 'ad_spend';
        // const dashboardResponse = {tiles:null,pieChat:null};
        if (id) {
            const startDate = moment(dataObj.endDate);
            const endDate = moment(dataObj.startDate);
            // console.log({
            //     startDate: endDate,
            //     endDate: startDate,
            //     startDateUnix: startDateUnix,
            //     endDateUnix: endDateUnix
            // });

            const storeRepository = (
                await this.publicConnection()
            ).getRepository(StoreConfig);
            const getStoreData = await storeRepository.findOne({
                where: { id: id },
            });
            const schema_name = `default_${getStoreData.user_id}`;

            const advertiserRepository = (
                await this.connection(schema_name)
            ).getRepository(Advertisers);

            const ordersRepository = (
                await this.connection(schema_name)
            ).getRepository(Orders);
            const ordersChargesRepository = (
                await this.connection(schema_name)
            ).getRepository(OrderCharges);
            const reconRepository = (
                await this.connection(schema_name)
            ).getRepository(Recon);

            const reconWfsFulFillmentFees = await reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.transaction_type IN (:...transactionTypes)', {
                    transactionTypes: ['Adjustment', 'Service Fee'],
                })
                .andWhere(
                    'recon.transaction_description IN (:...transactionDescriptions)',
                    {
                        transactionDescriptions: [
                            'WFS Fulfillment fee',
                            '"WFS Return Shipping fee "',
                            'Walmart Return Shipping Charge',
                        ],
                    },
                )
                .andWhere('recon.amount_type IN (:...amountTypes)', {
                    amountTypes: ['Fee/Reimbursement', 'Item Fees'],
                })
                // .andWhere('recon.period_start_date >= :startDate', { startDate: endDate.format('MM/DD/YYYY')})
                // .andWhere('recon.period_end_date <= :endDate', { endDate: startDate.format('MM/DD/YYYY') })
                .andWhere(
                    'recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate',
                    {
                        startDate: endDate.format('YYYY-MM-DD'),
                        endDate: startDate.format('YYYY-MM-DD'),
                    },
                )
                .andWhere('recon.store_id = :id', { id: id })
                .getRawOne();

            const reconDisputes = await reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                .where('recon.transaction_type IN (:...transactionTypes)', {
                    transactionTypes: ['Adjustment', 'Dispute Settlement'],
                })
                .andWhere(
                    'recon.transaction_description IN (:...transactionDescriptions)',
                    {
                        transactionDescriptions: [
                            'Walmart Return Shipping Charge Reversal',
                            'Walmart Customer Care Refund Reversal',
                        ],
                    },
                )
                .andWhere('recon.amount_type = :amountTypes', {
                    amountTypes: 'Fee/Reimbursement',
                })
                // .andWhere('recon.period_start_date >= :startDate', { startDate: endDate.format('MM/DD/YYYY')})
                // .andWhere('recon.period_end_date <= :endDate', { endDate: startDate.format('MM/DD/YYYY') })
                .andWhere(
                    'recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate',
                    {
                        startDate: endDate.format('YYYY-MM-DD'),
                        endDate: startDate.format('YYYY-MM-DD'),
                    },
                )
                .andWhere('recon.store_id = :id', { id: id })
                .getRawOne();
            // console.clear();
            // console.log({ startDate: endDate.format('MM/DD/YYYY'),endDate: startDate.format('MM/DD/YYYY')});
            const reconCommission = await reconRepository
                .createQueryBuilder('recon')
                .select('COALESCE(SUM(recon.amount), 0)', 'total_amount')
                // .where('recon.transaction_type IN (:...transactionTypes)', { transactionTypes: ['Sale', 'Return'] })
                // .andWhere('recon.transaction_description IN (:...transactionDescriptions)', { transactionDescriptions: ['Purchase', 'Return Refund'] })
                .where('recon.amount_type = :amountTypes', {
                    amountTypes: 'Commission on Product',
                })
                // .andWhere('recon.period_start_date >= :startDate', { startDate: endDate.format('MM/DD/YYYY')})
                // .andWhere('recon.period_end_date <= :endDate', { endDate: startDate.format('MM/DD/YYYY') })
                .andWhere(
                    'recon.transaction_posted_timestamp BETWEEN :startDate AND :endDate',
                    {
                        startDate: endDate.format('YYYY-MM-DD'),
                        endDate: startDate.format('YYYY-MM-DD'),
                    },
                )
                .andWhere('recon.store_id = :id', { id: id })
                .getRawOne();

            const advertiserData = await advertiserRepository
                .createQueryBuilder('advertisers')
                .select('SUM(impressions)', 'total_impressions') // One
                .addSelect('SUM(clicks)', 'total_clicks') // One
                .addSelect('CAST(SUM(ad_spend) AS DECIMAL(10, 2))', 'ad_spends') // one
                .addSelect(
                    'CAST(SUM(orders)/SUM(clicks) * 100 AS DECIMAL(10, 2))',
                    'cvr_order',
                )
                .addSelect(
                    'CAST(SUM(units_sold)/SUM(clicks) * 100 AS DECIMAL(10, 2))',
                    'cvr_unit',
                )
                .addSelect(
                    'CAST(SUM(clicks)/SUM(impressions) * 100 AS DECIMAL(10, 2))',
                    'ctr',
                )
                .addSelect(
                    'CAST(SUM(total_attributed_sales)/SUM(ad_spend) AS DECIMAL(10, 2))',
                    'roas',
                )
                .addSelect(
                    'CAST(SUM(ad_spend)/SUM(total_attributed_sales) AS DECIMAL(10, 2))',
                    'acos',
                )
                .addSelect(
                    'CAST(SUM(total_attributed_sales) AS DECIMAL(10, 2))',
                    'ad_sales',
                ) // one
                .addSelect('SUM(orders)', 'ad_orders')
                .addSelect('SUM(units_sold)', 'ad_units')
                .addSelect(
                    'CAST(SUM(ad_spend) / SUM(clicks) AS DECIMAL(10, 2))',
                    'average_cpc',
                )
                .where('advertisers.store_id = :id', { id: id })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: endDate.format('YYYY-MM-DD'),
                    endDate: startDate.format('YYYY-MM-DD'),
                })
                .getRawMany();

            const orders = await ordersRepository
                .createQueryBuilder('orders')
                .select('id', 'order_id')
                // .leftJoin('order_charges', 'oc', 'oc.order_id = orders.id')
                .where('orders.store_id = :store_id', { store_id: id })
                .andWhere(
                    'orders.formated_date BETWEEN :startDate AND :endDate',
                    {
                        startDate: endDate.format('YYYY-MM-DD'),
                        endDate: startDate.format('YYYY-MM-DD'),
                    },
                )
                .groupBy('orders.id')
                .getRawMany();

            const orderids = [];
            for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
                orderids.push(orders[orderIndex].order_id);
            }
            advertiserData[0].troas = null;
            advertiserData[0].tacos = null;
            advertiserData[0].organic_sales = null;
            advertiserData[0].organic_sales_percentage = null;
            advertiserData[0].total_sale = null;
            advertiserData[0].total_order = null;
            if (orderids.length > 0) {
                const orderCharges = await ordersChargesRepository
                    .createQueryBuilder('order_charges')
                    .select(
                        'SUM(order_charges.product_amount)',
                        'total_product_amount',
                    )
                    .addSelect(
                        'COUNT(distinct order_charges.order_id)',
                        'total_order',
                    )
                    // .addSelect('count(order_charges.id)','total_order')
                    .where('order_charges.order_id IN (:...values)', {
                        values: orderids,
                    })
                    .andWhere('order_charges.charge_type = :charge_type', {
                        charge_type: 'PRODUCT',
                    })
                    .andWhere('order_charges.order_status != :order_status', {
                        order_status: 'Cancelled',
                    })
                    // .groupBy('order_charges.order_id')
                    .getRawMany();

                // Below We're getting TRoAS, TACoS, Organic Sales and Organic Sales %

                // advertiserData[0].total_order = null;
                if (orderCharges.length > 0) {
                    advertiserData[0].total_order = orderCharges[0].total_order;
                    advertiserData[0].total_sale =
                        orderCharges[0].total_product_amount;

                    const troas =
                        orderCharges[0].total_product_amount /
                        advertiserData[0].ad_spends;
                    const tacos =
                        advertiserData[0].ad_spends /
                        orderCharges[0].total_product_amount;
                    const organic_sales =
                        orderCharges[0].total_product_amount -
                        advertiserData[0].ad_sales;
                    const organic_sales_percentage =
                        organic_sales / orderCharges[0].total_product_amount;

                    advertiserData[0].troas = troas.toFixed(2);
                    advertiserData[0].tacos = tacos.toFixed(2);
                    advertiserData[0].organic_sales = organic_sales.toFixed(2);
                    advertiserData[0].organic_sales_percentage =
                        organic_sales_percentage.toFixed(2);
                }
            }

            const pieChart = await this.pieChart(
                id,
                metricsFilterType,
                endDate.format('YYYY-MM-DD'),
                startDate.format('YYYY-MM-DD'),
                schema_name,
            );
            const barChart = await this.barChart(
                id,
                endDate.format('YYYY-MM-DD'),
                startDate.format('YYYY-MM-DD'),
                schema_name,
            );
            (await this.publicConnection()).destroy();
            (await this.connection(schema_name)).destroy();
            return res.send({
                data: advertiserData[0],
                pieChart: pieChart,
                barChart: barChart,
                reconWfsFulFillmentFees: reconWfsFulFillmentFees,
                reconDisputes: reconDisputes,
                reconCommission: reconCommission,
                startDate: endDate.format('YYYY-MM-DD'),
                endDate: startDate.format('YYYY-MM-DD'),
            });
        } else {
            return (
                res.status(500),
                res.send({ message: "Sorry, you doesn't have store" })
            );
        }
    }

    async pieChart(id, metricsFilterType, start, end, schema_name) {
        const alias =
            metricsFilterType === 'ad_spend'
                ? 'ad_spends'
                : metricsFilterType === 'total_attributed_sales'
                ? 'ad_sales'
                : metricsFilterType === 'clicks'
                ? 'total_clicks'
                : metricsFilterType === 'impressions'
                ? 'total_impressions'
                : undefined;

        if (id) {
            // const startDate = moment(end).format('YYYY-MM-DD');
            // const endDate = moment(start).format('YYYY-MM-DD');
            const autoCampaign = await (
                await this.connection(schema_name)
            )
                .createQueryBuilder(Advertisers, 'advertisers')
                .select(
                    `CAST(SUM(advertisers.${metricsFilterType}) AS DECIMAL(10, 2))`,
                    `${alias}`,
                )
                .where((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select('camp.campaign_id')
                        .from('campaign_snapshot', 'camp')
                        .where('camp.targeting_type = :targeting_type', {
                            targeting_type: 'auto',
                        })
                        .getQuery();
                    return 'advertisers.campaign_id IN ' + subQuery;
                })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: start,
                    endDate: end,
                })
                .andWhere('advertisers.store_id = :storeId', { storeId: id })
                .getRawOne();

            const manualCampaign = await (
                await this.connection(schema_name)
            )
                .createQueryBuilder(Advertisers, 'advertisers')
                .select(
                    `CAST(SUM(advertisers.${metricsFilterType}) AS DECIMAL(10, 2))`,
                    `${alias}`,
                )
                .where((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select('camp.campaign_id')
                        .from('campaign_snapshot', 'camp')
                        .where('camp.targeting_type = :targeting_type', {
                            targeting_type: 'manual',
                        })
                        .getQuery();
                    return 'advertisers.campaign_id IN ' + subQuery;
                })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: start,
                    endDate: end,
                })
                .andWhere('advertisers.store_id = :storeId', { storeId: id })
                .getRawOne();

            return {
                metricsFilterType: metricsFilterType,
                autoCampaign: autoCampaign[alias],
                manualCampaign: manualCampaign[alias],
                // sbCampaign: sbCampaign[0][alias]
            };
        }
    }

    async barChart(id, endDate, startDate, schema_name) {
        const ordersRepository = (
            await this.connection(schema_name)
        ).getRepository(Orders);
        const orders = await ordersRepository
            .createQueryBuilder('o')
            .select('o.formated_date', 'date')
            .addSelect('COUNT(distinct oc.order_id)', 'total_order')
            .addSelect('SUM(oc.product_amount)', 'total_sales')
            .leftJoin('order_charges', 'oc', 'o.id = oc.order_id')
            .where('o.store_id = :store_id', { store_id: id })
            .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                startDate: endDate,
                endDate: startDate,
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
        const totalOrders = [];
        const totalSales = [];
        orders.map((order) => {
            dates.push(order.date);
            totalOrders.push(parseFloat(order.total_order));
            totalSales.push(parseFloat(order.total_sales));
        });
        return {
            dates: dates,
            totalOrders: totalOrders,
            totalSales: totalSales,
        };
    }
}
