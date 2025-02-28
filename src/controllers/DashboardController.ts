import {
    Body,
    JsonController,
    Post,
    Res,
    UseBefore,
} from 'routing-controllers';
import { DataSourceConnection } from '../connection';
import { Advertisers, Orders } from '../entity/Index';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { Response } from 'express';
import moment from 'moment';
import { findSchemaNameWithArray } from '../helper/helper';

@JsonController('/dashboard')
@UseBefore(loggingMiddleware)
export class DashboardController extends DataSourceConnection {
    @Post('/')
    async index(@Body() dataObj, @Res() res: Response) {
        const salesMetricsAlias = dataObj.salesMetrics
            ? dataObj.salesMetrics
            : 'total_sales';
        const id = dataObj.store_id;

        const getSchema = await findSchemaNameWithArray(id);

        if (id.length > 0) {
            const startDate = moment(dataObj.startDate).format('YYYY-MM-DD');
            const endDate = moment(dataObj.endDate).format('YYYY-MM-DD');

            const comparisonStartDate = moment(
                dataObj.comparison_startDate,
            ).format('YYYY-MM-DD');
            const comparisonEndDate = moment(dataObj.comparison_endDate).format(
                'YYYY-MM-DD',
            );

            const schema_name = getSchema.schemaName;

            const advertiserRepository = (
                await this.connection(schema_name)
            ).getRepository(Advertisers);

            const ordersRepository = (
                await this.connection(schema_name)
            ).getRepository(Orders);

            const advertiserData = await advertiserRepository
                .createQueryBuilder('advertisers')
                .select('CAST(SUM(ad_spend) AS DECIMAL(10, 2))', 'ad_spends')
                .where('advertisers.store_id IN (:...values)', { values: id });

            const currentPeriodAdvertiserData = await advertiserData
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                .getRawMany();

            const lastPeriodAdvertiserData = await advertiserData
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: comparisonStartDate,
                    endDate: comparisonEndDate,
                })
                .getRawMany();

            const order = await ordersRepository
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

            const currentPeriodOrder = await order
                .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                .getRawOne();

            const lastPeriodOrder = await order
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
                const ad_spends =
                    currentPeriodAdvertiserData[0].ad_spends === null
                        ? null
                        : currentPeriodAdvertiserData[0].ad_spends;

                if (ad_spends != null) {
                    const troas =
                        currentPeriodOrder.total_product_amount / ad_spends;
                    const tacos =
                        (ad_spends / currentPeriodOrder.total_product_amount) *
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
                const ad_spends =
                    lastPeriodAdvertiserData[0].ad_spends === null
                        ? null
                        : lastPeriodAdvertiserData[0].ad_spends;

                if (ad_spends != null) {
                    const troas =
                        lastPeriodOrder.total_product_amount / ad_spends;
                    const tacos =
                        (ad_spends / lastPeriodOrder.total_product_amount) *
                        100;
                    lastPeriodData.troas = troas ? troas.toFixed(2) : 0.0;
                    lastPeriodData.tacos = tacos.toFixed(2);
                }
            }

            const barChart = await this.barChart(
                id,
                startDate,
                endDate,
                schema_name,
                salesMetricsAlias,
            );
            (await this.connection(schema_name)).destroy();
            return res.send({
                data: data,
                lastPeriodData: lastPeriodData,
                barChart: barChart,
                startDate: startDate,
                endDate: endDate,
                comparisonStartDate: comparisonStartDate,
                comparisonEndDate: comparisonEndDate,
            });
        } else {
            return (
                res.status(500),
                res.send({ message: "Sorry, you doesn't have store" })
            );
        }
    }

    async barChart(id, startDate, endDate, schema_name, salesMetricsAlias) {
        const subquery =
            salesMetricsAlias === 'total_sales'
                ? 'SUM(oc.product_amount)'
                : 'COUNT(distinct oc.order_id)';
        const ordersRepository = (
            await this.connection(schema_name)
        ).getRepository(Orders);

        const orders = await ordersRepository
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
            dates.push(moment(order.date).format('YYYY-MM-DD'));
            dateBelongingData.push(parseFloat(order[salesMetricsAlias]));
            // totalSales.push(parseFloat(order.total_sales));
        });
        (await this.connection(schema_name)).destroy();
        return {
            dates: dates,
            dateBelongingData: dateBelongingData,
            salesMetrics: salesMetricsAlias,
            // totalSales: totalSales,
        };
    }
}
