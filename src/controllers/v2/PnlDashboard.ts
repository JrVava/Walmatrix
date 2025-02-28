import {
    Body,
    JsonController,
    Post,
    Res,
    UseBefore,
} from 'routing-controllers';
import { DataSourceConnection } from '../../connection';
import { findSchemaNameWithArray } from '../../helper/helper';
import moment from 'moment';
import { loggingMiddleware } from '../../service/loggingMiddleware';
import { Response } from 'express';

@JsonController('/v2/pnl-dashboard')
@UseBefore(loggingMiddleware)
export class PnlDashboard extends DataSourceConnection {
    @Post('/')
    async index(@Body() dataObj, @Res() res: Response) {
        const {
            startDate,
            endDate,
            store_id,
            metrix,
            comparison_startDate,
            comparison_endDate,
        } = dataObj;
        const dateQuery = `SELECT TO_CHAR(generate_series('${startDate}'::date, '${endDate}'::date, '1 day'::interval), 'YYYY-MM-DD') AS date`;
        const dateResults = await (
            await this.publicConnection()
        ).query(dateQuery);
        const query = await this.queryFunction(startDate, endDate, store_id);
        const accountLevelFeesByDate = dateResults.map((date) => {
            const matchingInBoundRecords = query.inboundTransportationFee.find(
                (data) => {
                    if (data.date === date.date) return data.total_amount;
                },
            );

            const matchingStorageFees = query.storageFees.find((data) => {
                if (data.date === date.date) return data.total_amount;
            });

            const matchingLostInventoryFees = query.lostInventoryFees.find(
                (data) => {
                    if (data.date === date.date) return data.total_amount;
                },
            );

            const matchingFoundInventoryFees = query.foundInventoryFees.find(
                (data) => {
                    if (data.date === date.date) return data.total_amount;
                },
            );

            const matchingRefundFees = query.refundFees.find((data) => {
                if (data.date === date.date) return data.total_amount;
            });

            const matchingDamageInWarehouse = query.damageInWarehouse.find(
                (data) => {
                    if (data.date === date.date) return data.total_amount;
                },
            );

            const matchingRC_InventoryDisposalFee =
                query.rc_InventoryDisposalFee.find((data) => {
                    if (data.date === date.date) return data.total_amount;
                });

            const matchingPrepServiceFee = query.prepServiceFee.find((data) => {
                if (data.date === date.date) return data.total_amount;
            });

            const matchingInventoryTransferFee =
                query.inventoryTransferFee.find((data) => {
                    if (data.date === date.date) return data.total_amount;
                });

            const matchingRC_InventoryRTVFee = query.rc_InventoryRTVFee.find(
                (data) => {
                    if (data.date === date.date) return data.total_amount;
                },
            );

            const matchingReviewAccelerator = query.reviewAccelerator.find(
                (data) => {
                    if (data.date === date.date) return data.total_amount;
                },
            );

            const matchingWFSInventoryRemovalOrder =
                query.WFSInventoryRemovalOrder.find((data) => {
                    if (data.date === date.date) return data.total_amount;
                });

            const matchingAd_logo = query.ad_logo.find((data) => {
                if (data.date === date.date) return data.total_ad_spend;
            });

            return {
                date: date.date,
                inBoundRecords:
                    matchingInBoundRecords === undefined
                        ? 0
                        : matchingInBoundRecords.total_amount,
                storageFees:
                    matchingStorageFees === undefined
                        ? 0
                        : matchingStorageFees.total_amount,
                lostInventoryFees:
                    matchingLostInventoryFees === undefined
                        ? 0
                        : matchingLostInventoryFees.total_amount,
                foundInventoryFees:
                    matchingFoundInventoryFees === undefined
                        ? 0
                        : matchingFoundInventoryFees.total_amount,
                refundFees:
                    matchingRefundFees === undefined
                        ? 0
                        : matchingRefundFees.total_amount,
                damageInWarehouse:
                    matchingDamageInWarehouse === undefined
                        ? 0
                        : matchingDamageInWarehouse.total_amount,
                rc_InventoryDisposalFee:
                    matchingRC_InventoryDisposalFee === undefined
                        ? 0
                        : matchingRC_InventoryDisposalFee.total_amount,
                prepServiceFee:
                    matchingPrepServiceFee === undefined
                        ? 0
                        : matchingPrepServiceFee.total_amount,
                inventoryTransferFee:
                    matchingInventoryTransferFee === undefined
                        ? 0
                        : matchingInventoryTransferFee.total_amount,
                rc_InventoryRTVFee:
                    matchingRC_InventoryRTVFee === undefined
                        ? 0
                        : matchingRC_InventoryRTVFee.total_amount,
                reviewAccelerator:
                    matchingReviewAccelerator === undefined
                        ? 0
                        : matchingReviewAccelerator.total_amount,
                wfsInventoryRemovalOrder:
                    matchingWFSInventoryRemovalOrder === undefined
                        ? 0
                        : matchingWFSInventoryRemovalOrder.total_amount,
                ad_logo:
                    matchingAd_logo === undefined
                        ? 0
                        : matchingAd_logo.total_ad_spend,
            };
        });
        const datesArray = accountLevelFeesByDate.map((x) => x.date);
        const graphArrayData = { datesArray: datesArray };
        if (metrix.includes('ad_logo')) {
            graphArrayData['ad_logo'] = accountLevelFeesByDate.map((x) =>
                parseFloat(x.ad_logo),
            );
        }
        if (metrix.includes('damageInWarehouse')) {
            graphArrayData['damageInWarehouse'] = accountLevelFeesByDate.map(
                (x) => parseFloat(x.damageInWarehouse),
            );
        }
        if (metrix.includes('foundInventory')) {
            graphArrayData['foundInventory'] = accountLevelFeesByDate.map((x) =>
                parseFloat(x.foundInventoryFees),
            );
        }
        if (metrix.includes('inboundTransportationFee')) {
            graphArrayData['inboundTransportationFee'] =
                accountLevelFeesByDate.map((x) => parseFloat(x.inBoundRecords));
        }
        if (metrix.includes('inventoryTransferFee')) {
            graphArrayData['inventoryTransferFee'] = accountLevelFeesByDate.map(
                (x) => parseFloat(x.inventoryTransferFee),
            );
        }
        if (metrix.includes('lostInventory')) {
            graphArrayData['lostInventory'] = accountLevelFeesByDate.map((x) =>
                parseFloat(x.lostInventoryFees),
            );
        }
        if (metrix.includes('prepServiceFee')) {
            graphArrayData['prepServiceFee'] = accountLevelFeesByDate.map((x) =>
                parseFloat(x.prepServiceFee),
            );
        }
        if (metrix.includes('rc_InventoryDisposalFee')) {
            graphArrayData['rc_InventoryDisposalFee'] =
                accountLevelFeesByDate.map((x) =>
                    parseFloat(x.rc_InventoryDisposalFee),
                );
        }
        if (metrix.includes('rc_InventoryRTVFee')) {
            graphArrayData['rc_InventoryRTVFee'] = accountLevelFeesByDate.map(
                (x) => parseFloat(x.rc_InventoryRTVFee),
            );
        }
        if (metrix.includes('refund')) {
            graphArrayData['refund'] = accountLevelFeesByDate.map((x) =>
                parseFloat(x.refundFees),
            );
        }
        if (metrix.includes('storageFee')) {
            graphArrayData['storageFee'] = accountLevelFeesByDate.map((x) =>
                parseFloat(x.storageFees),
            );
        }
        if (metrix.includes('inventoryRemovalOrder')) {
            graphArrayData['inventoryRemovalOrder'] =
                accountLevelFeesByDate.map((x) =>
                    parseFloat(x.wfsInventoryRemovalOrder),
                );
        }
        if (metrix.includes('reviewAccelerator')) {
            graphArrayData['reviewAccelerator'] = accountLevelFeesByDate.map(
                (x) => parseFloat(x.reviewAccelerator),
            );
        }

        const total_ad_logo = accountLevelFeesByDate
            .map((x) => +x.ad_logo)
            .reduce((a, b) => a + b);

        const total_damageInWarehouse = accountLevelFeesByDate
            .map((x) => +x.damageInWarehouse)
            .reduce((a, b) => a + b);
        const total_foundInventory = accountLevelFeesByDate
            .map((x) => +x.foundInventoryFees)
            .reduce((a, b) => a + b);
        const total_inboundTransportationFee = accountLevelFeesByDate
            .map((x) => +x.inBoundRecords)
            .reduce((a, b) => a + b);
        const total_inventoryTransferFee = accountLevelFeesByDate
            .map((x) => +x.inventoryTransferFee)
            .reduce((a, b) => a + b);
        const total_lostInventory = accountLevelFeesByDate
            .map((x) => +x.lostInventoryFees)
            .reduce((a, b) => a + b);
        const total_prepServiceFee = accountLevelFeesByDate
            .map((x) => +x.prepServiceFee)
            .reduce((a, b) => a + b);
        const total_rc_InventoryDisposalFee = accountLevelFeesByDate
            .map((x) => +x.rc_InventoryDisposalFee)
            .reduce((a, b) => a + b);
        const total_rc_InventoryRTVFee = accountLevelFeesByDate
            .map((x) => +x.rc_InventoryRTVFee)
            .reduce((a, b) => a + b);
        const total_refund = accountLevelFeesByDate
            .map((x) => +x.refundFees)
            .reduce((a, b) => a + b);
        const total_storageFee = accountLevelFeesByDate
            .map((x) => +x.storageFees)
            .reduce((a, b) => a + b);
        const total_inventoryRemovalOrder = accountLevelFeesByDate
            .map((x) => +x.wfsInventoryRemovalOrder)
            .reduce((a, b) => a + b);
        const total_reviewAccelerator = accountLevelFeesByDate
            .map((x) => +x.reviewAccelerator)
            .reduce((a, b) => a + b);
        const comparisonData = await this.comparisonData(
            comparison_startDate,
            comparison_endDate,
            store_id,
        );
        return res.send({
            graphArrayData: graphArrayData,
            currentData: {
                total_ad_logo: total_ad_logo,
                total_damageInWarehouse: total_damageInWarehouse,
                total_foundInventory: total_foundInventory,
                total_inboundTransportationFee: total_inboundTransportationFee,
                total_inventoryTransferFee: total_inventoryTransferFee,
                total_lostInventory: total_lostInventory,
                total_prepServiceFee: total_prepServiceFee,
                total_rc_InventoryDisposalFee: total_rc_InventoryDisposalFee,
                total_rc_InventoryRTVFee: total_rc_InventoryRTVFee,
                total_refund: total_refund,
                total_storageFee: total_storageFee,
                total_inventoryRemovalOrder: total_inventoryRemovalOrder,
                total_reviewAccelerator: total_reviewAccelerator,
            },
            comparisonData: comparisonData,
        });
    }

    async comparisonData(startDT, endDT, store_id) {
        const query = await this.queryFunction(startDT, endDT, store_id);
        // console.log("query", query);
        // return {}
        const total_inboundTransportationFee = query.inboundTransportationFee
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_storageFees = query.storageFees
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_lostInventoryFees = query.lostInventoryFees
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_foundInventoryFees = query.foundInventoryFees
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_refundFees = query.refundFees
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_damageInWarehouse = query.damageInWarehouse
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_rc_InventoryDisposalFee = query.rc_InventoryDisposalFee
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_prepServiceFee = query.prepServiceFee
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_inventoryTransferFee = query.inventoryTransferFee
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_rc_InventoryRTVFee = query.rc_InventoryRTVFee
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_ad_logo = query.ad_logo
            .map((x) => +x.total_ad_spend)
            .reduce((a, b) => a + b);
        const total_reviewAccelerator = query.reviewAccelerator
            .map((x) => +x.total_amount)
            .reduce((a, b) => a + b);
        const total_WFSInventoryRemovalOrder =
            query.WFSInventoryRemovalOrder.map((x) => +x.total_amount).reduce(
                (a, b) => a + b,
            );
        return {
            comparison_total_inboundTransportationFee:
                total_inboundTransportationFee,
            comparison_total_storageFees: total_storageFees,
            comparison_total_lostInventoryFees: total_lostInventoryFees,
            comparison_total_foundInventoryFees: total_foundInventoryFees,
            comparison_total_refundFees: total_refundFees,
            comparison_total_damageInWarehouse: total_damageInWarehouse,
            comparison_total_rc_InventoryDisposalFee:
                total_rc_InventoryDisposalFee,
            comparison_total_prepServiceFee: total_prepServiceFee,
            comparison_total_inventoryTransferFee: total_inventoryTransferFee,
            comparison_total_rc_InventoryRTVFee: total_rc_InventoryRTVFee,
            comparison_total_ad_logo: total_ad_logo,
            comparison_total_reviewAccelerator: total_reviewAccelerator,
            comparison_total_WFSInventoryRemovalOrder:
                total_WFSInventoryRemovalOrder,
        };
    }

    async queryFunction(startDT, endDT, store_id) {
        const getSchema = await findSchemaNameWithArray(store_id);
        const schema_name = getSchema.schemaName;
        const startDate = moment(startDT).format('YYYY-MM-DD');
        const endDate = moment(endDT).format('YYYY-MM-DD');

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
                r.store_id in (${store_id})
                and r.transaction_description = 'WFS InboundTransportationFee'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc`;
        const inboundTransportationFeeResult = await (
            await this.publicConnection()
        ).query(inboundTransportationFeeQuery);

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
                r.store_id in (${store_id})
                and r.transaction_description = 'WFS StorageFee'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc
        `;
        const storageFeesResult = await (
            await this.publicConnection()
        ).query(storageFeeQuery);

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
                r.store_id in (${store_id})
                and r.transaction_description = 'WFS LostInventory'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc`;

        const lostInventoryFeesResult = await (
            await this.publicConnection()
        ).query(lostInventoryQuery);

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
                r.store_id in (${store_id})
                and r.transaction_description = 'WFS FoundInventory'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc
        `;
        const foundInventoryFeesResult = await (
            await this.publicConnection()
        ).query(foundInvetoryQuery);

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
                r.store_id in (${store_id})
                and r.transaction_description = 'WFS Refund'
                and r.transaction_posted_timestamp between '${startDate}' and '${endDate}'
            group by r.transaction_posted_timestamp) as subquery
        on gs.date = subquery.date
        group by gs.date
        order by gs.date asc
        `;

        const refundFeesResult = await (
            await this.publicConnection()
        ).query(refundQuery);

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
                r.store_id in (${store_id})
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

        const damageInWarehouseResult = await (
            await this.publicConnection()
        ).query(damageInWarehouseQuery);

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
                    r.store_id in (${store_id})
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
        const rc_InventoryDisposalFeeResult = await (
            await this.publicConnection()
        ).query(rc_InventoryDisposalFeeQuery);

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
                    r.store_id in (${store_id})
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

        const prepServiceFeeResult = await (
            await this.publicConnection()
        ).query(prepServiceFeeQuery);

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
                r.store_id in (${store_id})
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

        const inventoryTransferFeeResult = await (
            await this.publicConnection()
        ).query(inventoryTransferFeeQuery);

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
                r.store_id in (${store_id})
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
        const rc_InventoryRTVFeeResult = await (
            await this.publicConnection()
        ).query(rc_InventoryRTVFeeQuery);

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
                    a.store_id in (${store_id})
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
        const ad_logoResult = await (
            await this.publicConnection()
        ).query(ad_logoQuery);

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
                    r.store_id in (${store_id})
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

        const reviewAcceleratorResult = await (
            await this.publicConnection()
        ).query(reviewAcceleratorQuery);

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
                    r.store_id in (${store_id})
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

        const WFSInventoryRemovalOrderResult = await (
            await this.publicConnection()
        ).query(WFSInventoryRemovalOrderQuery);

        return {
            inboundTransportationFee: inboundTransportationFeeResult,
            storageFees: storageFeesResult,
            lostInventoryFees: lostInventoryFeesResult,
            foundInventoryFees: foundInventoryFeesResult,
            refundFees: refundFeesResult,
            damageInWarehouse: damageInWarehouseResult,
            rc_InventoryDisposalFee: rc_InventoryDisposalFeeResult,
            prepServiceFee: prepServiceFeeResult,
            inventoryTransferFee: inventoryTransferFeeResult,
            rc_InventoryRTVFee: rc_InventoryRTVFeeResult,
            ad_logo: ad_logoResult,
            reviewAccelerator: reviewAcceleratorResult,
            WFSInventoryRemovalOrder: WFSInventoryRemovalOrderResult,
        };
    }
}
