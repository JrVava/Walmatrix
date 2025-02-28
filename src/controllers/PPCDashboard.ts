import { Response } from 'express';
import {
    Body,
    JsonController,
    Post,
    Res,
    UseBefore,
} from 'routing-controllers';
import moment from 'moment';
import { DataSourceConnection } from '../connection';
import { Advertisers, Orders } from '../entity/Index';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { findSchemaNameWithArray } from '../helper/helper';

@JsonController('/ppc')
@UseBefore(loggingMiddleware)
export class PPCDashboard extends DataSourceConnection {
    @Post('/dashboard')
    async dashboard(@Body() dataObj, @Res() res: Response) {
        const id = dataObj.store_id;
        const getSchema = await findSchemaNameWithArray(id);

        const metricsFilterType = dataObj.metricsFilterType
            ? dataObj.metricsFilterType
            : 'ad_spend';

        const barChartFilterMetrics = dataObj.menuFilterTypeChart
            ? dataObj.menuFilterTypeChart
            : 'ad_spend';

        if (id.length > 0) {
            const startDate = moment(dataObj.startDate).format('YYYY-MM-DD');
            const endDate = moment(dataObj.endDate).format('YYYY-MM-DD');

            const comparisonStartDate = moment(
                dataObj.comparison_startDate,
            ).format('YYYY-MM-DD');
            const comparisonEndDate = moment(dataObj.comparison_endDate).format(
                'YYYY-MM-DD',
            );

            const schema_name = getSchema.schemaName; //`default_${getStoreData.user_id}`;

            const advertiserRepository = (
                await this.connection(schema_name)
            ).getRepository(Advertisers);
            const ordersRepository = (
                await this.connection(schema_name)
            ).getRepository(Orders);

            const advertiserData = await advertiserRepository
                .createQueryBuilder('advertisers')
                .select('SUM(impressions)', 'total_impressions')
                .addSelect('SUM(clicks)', 'total_clicks')
                .addSelect('CAST(SUM(ad_spend) AS DECIMAL(10, 2))', 'ad_spends')

                .addSelect(
                    //'CAST(SUM(orders)/SUM(clicks) * 100 AS DECIMAL(10, 2))',
                    'CASE WHEN SUM(clicks) > 0 THEN CAST(SUM(orders) AS FLOAT) / SUM(clicks) * 100 ELSE 0 END',
                    'cvr_order',
                )

                .addSelect(
                    //'CAST(SUM(units_sold)/SUM(clicks) * 100 AS DECIMAL(10, 2))',
                    'CASE WHEN SUM(clicks) > 0 THEN CAST(COALESCE(SUM(units_sold), 0) AS FLOAT) / CAST(COALESCE(SUM(clicks), 0) AS FLOAT) * 100 ELSE 0 END',
                    'cvr_unit',
                )

                .addSelect(
                    // 'CAST(SUM(clicks)/SUM(impressions) * 100 AS DECIMAL(10, 2))',
                    'CAST(CASE WHEN SUM(impressions) > 0 THEN CAST(SUM(clicks) / SUM(impressions) AS FLOAT) * 100 ELSE 0 END AS FLOAT)',
                    'ctr',
                )
                .addSelect(
                    // 'CAST(SUM(total_attributed_sales)/SUM(ad_spend) AS DECIMAL(10, 2))',
                    'CAST(CASE WHEN SUM(ad_spend) > 0 THEN CAST(SUM(total_attributed_sales) / SUM(ad_spend) AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)',
                    'roas',
                )
                .addSelect(
                    'CAST(CASE WHEN SUM(total_attributed_sales) > 0 THEN SUM(ad_spend) / SUM(total_attributed_sales) * 100 ELSE 0 END AS FLOAT)',
                    // 'CAST(SUM(ad_spend)/SUM(total_attributed_sales) AS DECIMAL(10, 2))',
                    'acos',
                )
                // .addSelect(
                //     'CAST(CASE WHEN SUM(total_attributed_sales) > 0 THEN CAST(SUM(ad_spend) / SUM(total_attributed_sales)) * 100 ELSE 0 END AS FLOAT)',
                //     // 'CAST(SUM(ad_spend)/SUM(total_attributed_sales) AS DECIMAL(10, 2))',
                //     'acos',
                // )
                .addSelect(
                    'CAST(SUM(total_attributed_sales) AS DECIMAL(10, 2))',
                    'ad_sales',
                )
                .addSelect('SUM(orders)', 'ad_orders')
                .addSelect('SUM(units_sold)', 'ad_units')
                .addSelect(
                    'CAST(CASE WHEN SUM(clicks) > 0 THEN CAST(SUM(ad_spend) / SUM(clicks) AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)',
                    // 'CAST(SUM(ad_spend) / SUM(clicks) AS DECIMAL(10, 2))',
                    'average_cpc',
                )
                .where('advertisers.store_id IN (:...values)', { values: id });

            const lastPeriodAdvertiser = await advertiserData
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: comparisonStartDate,
                    endDate: comparisonEndDate,
                })
                .getRawMany();

            const currentPeriodAdvertiser = await advertiserData
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                .getRawMany();

            const order = ordersRepository
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

            const currentPeriodOrders = await order
                .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                .getRawOne();
            const currentPeriodAdvertiserData = {
                troas: 0.0,
                tacos: 0.0,
                organic_sales: 0.0,
                organic_sales_percentage: 0.0,
                total_order: 0.0,
                total_units: 0.0,
                total_sale: 0.0,

                total_impressions: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].total_impressions)
                    : 0.0,
                total_clicks: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].total_clicks)
                    : 0.0,
                ad_spends: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].ad_spends)
                    : 0.0,
                cvr_order: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].cvr_order)
                    : 0.0,
                cvr_unit: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].cvr_unit)
                    : 0.0,
                ctr: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].ctr)
                    : 0.0,
                roas: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].roas)
                    : 0.0,
                acos: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].acos)
                    : 0.0,
                ad_sales: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].ad_sales)
                    : 0.0,
                ad_orders: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].ad_orders)
                    : 0.0,
                ad_units: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].ad_units)
                    : 0.0,
                average_cpc: currentPeriodAdvertiser
                    ? parseFloat(currentPeriodAdvertiser[0].average_cpc)
                    : 0.0,
            };
            // currentPeriodAdvertiserData[0].troas = null;
            // currentPeriodAdvertiserData[0].tacos = null;
            // currentPeriodAdvertiserData[0].organic_sales = null;
            // currentPeriodAdvertiserData[0].organic_sales_percentage = null;
            // currentPeriodAdvertiserData[0].total_sale = null;
            // currentPeriodAdvertiserData[0].total_order = null;
            // currentPeriodAdvertiserData[0].total_units = null;

            if (currentPeriodOrders) {
                currentPeriodAdvertiserData['total_order'] =
                    currentPeriodOrders.total_order
                        ? parseFloat(currentPeriodOrders.total_order)
                        : 0;

                currentPeriodAdvertiserData['total_units'] =
                    currentPeriodOrders.total_units
                        ? parseFloat(currentPeriodOrders.total_units)
                        : 0;

                currentPeriodAdvertiserData['total_sale'] = parseFloat(
                    currentPeriodOrders.total_product_amount,
                );

                const ad_spends =
                    currentPeriodAdvertiser['ad_spends'] === null
                        ? null
                        : currentPeriodAdvertiser[0].ad_spends;

                if (ad_spends != null && parseFloat(ad_spends) > 0) {
                    const troas =
                        currentPeriodOrders.total_product_amount / ad_spends;
                    const tacos =
                        (ad_spends / currentPeriodOrders.total_product_amount) *
                        100;
                    currentPeriodAdvertiserData['troas'] = parseFloat(
                        troas.toFixed(2),
                    );
                    currentPeriodAdvertiserData['tacos'] = parseFloat(
                        tacos.toFixed(2),
                    );
                }
                const ad_sales =
                    currentPeriodAdvertiserData['ad_sales'] === null
                        ? null
                        : currentPeriodAdvertiser[0].ad_sales;
                if (ad_sales != null) {
                    const organic_sales =
                        currentPeriodOrders.total_product_amount - ad_sales;
                    const organic_sales_percentage =
                        (organic_sales /
                            currentPeriodOrders.total_product_amount) *
                        100;
                    currentPeriodAdvertiserData['organic_sales'] = parseFloat(
                        organic_sales.toFixed(2),
                    );
                    currentPeriodAdvertiserData['organic_sales_percentage'] =
                        parseFloat(organic_sales_percentage.toFixed(2));
                }
            }

            const lastPeriodOrders = await order
                .andWhere('o.formated_date BETWEEN :startDate AND :endDate', {
                    startDate: comparisonStartDate,
                    endDate: comparisonEndDate,
                })
                .getRawOne();
            const lastPeriodAdvertiserData = {
                troas: 0.0,
                tacos: 0.0,
                organic_sales: 0.0,
                organic_sales_percentage: 0.0,
                total_order: 0.0,
                total_units: 0.0,
                total_sale: 0.0,

                total_impressions: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].total_impressions)
                    : 0.0,
                total_clicks: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].total_clicks)
                    : 0.0,
                ad_spends: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].ad_spends)
                    : 0.0,
                cvr_order: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].cvr_order)
                    : 0.0,
                cvr_unit: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].cvr_unit)
                    : 0.0,
                ctr: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].ctr)
                    : 0.0,
                roas: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].roas)
                    : 0.0,
                acos: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].acos)
                    : 0.0,
                ad_sales: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].ad_sales)
                    : 0.0,
                ad_orders: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].ad_orders)
                    : 0.0,
                ad_units: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].ad_units)
                    : 0.0,
                average_cpc: lastPeriodAdvertiser
                    ? parseFloat(lastPeriodAdvertiser[0].average_cpc)
                    : 0.0,
            };
            // lastPeriodAdvertiserData[0].troas = null;
            // lastPeriodAdvertiserData[0].tacos = null;
            // lastPeriodAdvertiserData[0].organic_sales = null;
            // lastPeriodAdvertiserData[0].organic_sales_percentage = null;
            // lastPeriodAdvertiserData[0].total_sale = null;
            // lastPeriodAdvertiserData[0].total_order = null;
            // lastPeriodAdvertiserData[0].total_units = null;

            if (lastPeriodOrders) {
                lastPeriodAdvertiserData['total_order'] = parseFloat(
                    lastPeriodOrders.total_order,
                );
                lastPeriodAdvertiserData['total_units'] = parseFloat(
                    lastPeriodOrders.total_units,
                );
                lastPeriodAdvertiserData['total_sale'] = parseFloat(
                    lastPeriodOrders.total_product_amount,
                );
                const ad_spends =
                    lastPeriodAdvertiser[0].ad_spends === null
                        ? null
                        : lastPeriodAdvertiser[0].ad_spends;
                if (ad_spends != null && parseFloat(ad_spends) > 0) {
                    const troas =
                        lastPeriodOrders.total_product_amount /
                        lastPeriodAdvertiser[0].ad_spends;
                    lastPeriodAdvertiserData['troas'] = parseFloat(
                        troas.toFixed(2),
                    );
                    const tacos =
                        (lastPeriodAdvertiser[0].ad_spends /
                            lastPeriodOrders.total_product_amount) *
                        100;
                    lastPeriodAdvertiserData['tacos'] = parseFloat(
                        tacos.toFixed(2),
                    );

                    // lastPeriodAdvertiser[0].troas = troas.toFixed(2);
                    // lastPeriodAdvertiser[0].tacos = tacos.toFixed(2);
                }
                const ad_sales =
                    lastPeriodAdvertiser[0].ad_sales === null
                        ? null
                        : lastPeriodAdvertiser[0].ad_sales;
                if (ad_sales) {
                    const organic_sales =
                        lastPeriodOrders.total_product_amount - ad_sales;
                    const organic_sales_percentage =
                        (organic_sales /
                            lastPeriodOrders.total_product_amount) *
                        100;

                    lastPeriodAdvertiserData['organic_sales'] = parseFloat(
                        organic_sales.toFixed(2),
                    );
                    lastPeriodAdvertiserData['organic_sales_percentage'] =
                        parseFloat(organic_sales_percentage.toFixed(2));
                }
            }

            const advertiser = await advertiserRepository
                .createQueryBuilder('a')
                .select('a.date', 'date')
                .addSelect('SUM(a.impressions)', 'total_impressions')
                .addSelect('SUM(clicks)', 'total_clicks')
                .addSelect('CAST(SUM(ad_spend) AS DECIMAL(10, 2))', 'ad_spends')
                .addSelect(
                    'CAST(SUM(total_attributed_sales) AS DECIMAL(10, 2))',
                    'ad_sales',
                )
                .where('a.store_id IN (:...values)', { values: id })
                .andWhere('a.date BETWEEN :startDate AND :endDate', {
                    startDate: startDate,
                    endDate: endDate,
                })
                .groupBy('a.date')
                .orderBy('a.date')
                .getRawMany();

            const date = [];
            const total_impressions = [];
            const total_clicks = [];
            const ad_spends = [];
            const ad_sales = [];

            for (let index = 0; index < advertiser.length; index++) {
                date.push(moment(advertiser[index].date).format('YYYY-MM-DD'));
                total_impressions.push(
                    parseFloat(advertiser[index].total_impressions),
                );
                total_clicks.push(parseFloat(advertiser[index].total_clicks));
                ad_spends.push(parseFloat(advertiser[index].ad_spends));
                ad_sales.push(parseFloat(advertiser[index].ad_sales));
            }

            const pieChart = await this.pieChart(
                id,
                metricsFilterType,
                startDate,
                endDate,
                schema_name,
            );

            const barChart = await this.barChart(
                id,
                barChartFilterMetrics,
                startDate,
                endDate,
                schema_name,
            );
            (await this.connection(schema_name)).destroy();
            return res.status(200).send({
                date: date,
                total_impressions: total_impressions,
                total_clicks: total_clicks,
                ad_spends: ad_spends,
                ad_sales: ad_sales,
                data: currentPeriodAdvertiserData,
                lastPeriodAdvertiserData: lastPeriodAdvertiserData,
                pieChart: pieChart,
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

        if (id.length > 0) {
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
                        .andWhere('camp.campaign_type = :campaign_type', {
                            campaign_type: 'sponsoredProducts',
                        })
                        .getQuery();
                    return 'advertisers.campaign_id IN ' + subQuery;
                })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: start,
                    endDate: end,
                })
                .andWhere('advertisers.store_id IN (:...values)', {
                    values: id,
                })
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
                        .andWhere('camp.campaign_type = :campaign_type', {
                            campaign_type: 'sponsoredProducts',
                        })
                        .getQuery();
                    return 'advertisers.campaign_id IN ' + subQuery;
                })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: start,
                    endDate: end,
                })
                .andWhere('advertisers.store_id IN (:...values)', {
                    values: id,
                })
                .getRawOne();

            const sbaCampaign = await (
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
                        .andWhere('camp.campaign_type = :campaign_type', {
                            campaign_type: 'sba',
                        })
                        .getQuery();
                    return 'advertisers.campaign_id IN ' + subQuery;
                })
                .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                    startDate: start,
                    endDate: end,
                })
                .andWhere('advertisers.store_id IN (:...values)', {
                    values: id,
                })
                .getRawOne();
            (await this.connection(schema_name)).destroy();
            return {
                metricsFilterType: metricsFilterType,
                autoCampaign: autoCampaign[alias],
                manualCampaign: manualCampaign[alias],
                sbCampaign: sbaCampaign[alias],
            };
        }
    }

    async barChart(id, metricsFilterType, start, end, schema_name) {
        const alias =
            metricsFilterType === 'ad_spend'
                ? 'ad_spends'
                : metricsFilterType === 'total_attributed_sales'
                ? 'ad_sales'
                : metricsFilterType === 'clicks'
                ? 'total_clicks'
                : undefined;

        const responseName =
            metricsFilterType === 'ad_spend'
                ? 'Ad Spend'
                : metricsFilterType === 'total_attributed_sales'
                ? 'Ad Sales'
                : metricsFilterType === 'clicks'
                ? 'Total Clicks'
                : undefined;

        const advertiserRepository = (
            await this.connection(schema_name)
        ).getRepository(Advertisers);

        const advertiserData = await advertiserRepository
            .createQueryBuilder('advertisers')
            .select('advertisers.date', 'date')
            .addSelect(`SUM(advertisers.${metricsFilterType})`, `${alias}`)
            .andWhere('advertisers.store_id IN (:...values)', { values: id })
            .andWhere('advertisers.date BETWEEN :startDate AND :endDate', {
                startDate: start,
                endDate: end,
            })
            .groupBy('advertisers.date')
            .getRawMany();

        const dates = [];
        const values = [];

        advertiserData.map((advertisers) => {
            dates.push(moment(advertisers.date).format('YYYY-MM-DD'));
            values.push(parseFloat(advertisers[alias]));
        });
        (await this.connection(schema_name)).destroy();
        return { dates: dates, values: values, name: responseName };
    }
}
