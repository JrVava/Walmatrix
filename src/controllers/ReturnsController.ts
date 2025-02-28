import { WallmartClients } from '../modules/WallmartClients';
import moment from 'moment';
import { UsersSettings, Returns, ReturnCharges } from '../entity/Index';
import logger from '../service/logger';

export class ReturnsController extends WallmartClients {
    public schema_name: string | null = null;
    public store_id: number | null = null;
    public user_setting_id: number;

    constructor() {
        super();
    }

    async returnWallmartData() {
        // console.clear();
        const startDate = moment();
        const endDate = moment();
        const last180Days = startDate.subtract(179, 'days').toISOString();
        const publicConnection = await this.publicConnection();
        const userSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const userSetting = await userSettingRepository.findOne({
            where: { id: this.user_setting_id },
        });

        let start;
        if (userSetting.return_sync_date === null) {
            start = last180Days;
        } else {
            start = userSetting.return_sync_date;
        }

        const returnDataArray = [];

        const returns = await this.getReturn(
            start,
            endDate.toISOString(),
            null,
        );
        let nextPage = returns.meta.nextCursor;

        returnDataArray.push(returns.returnOrders);
        if (nextPage) {
            const returnss = await this.getReturn(null, null, nextPage);
            nextPage = returnss.meta.nextCursor;
            returnDataArray.push(returnss.returnOrders);
        }
        await userSettingRepository.update(
            { id: this.user_setting_id },
            { return_sync_date: endDate.toISOString() },
        );
        this.storeReturnData(returnDataArray);
        return {};
    }

    async storeReturnData(returnDataArray = []) {
        const returnsRepository = (
            await this.connection(this.schema_name)
        ).getRepository(Returns);
        const returnChargesRepository = (
            await this.connection(this.schema_name)
        ).getRepository(ReturnCharges);
        for (const returnData of returnDataArray) {
            returnData.map(async (curr) => {
                // console.log("returnOrderId >>---> : ",curr.returnOrderId);
                const checkReturnxist = await returnsRepository.findOne({
                    where: { return_order_id: curr.returnOrderId },
                });

                if (checkReturnxist !== null) {
                    logger.info({ checkReturnExist: checkReturnxist.id });
                    return; // Skip saving the order if it already exists
                }

                const returnsData: Partial<Returns> = {
                    return_order_id: curr.returnOrderId,
                    customer_email_id: curr.customerEmailId,
                    customer_name: curr.customerName,
                    customer_order_id: curr.customerOrderId,
                    return_order_date: curr.returnOrderDate,
                    return_by_date: curr.returnByDate,
                    refund_mode: curr.refundMode,
                    total_currency_amount:
                        curr.totalRefundAmount.currencyAmount,
                    total_currency_unit: curr.totalRefundAmount.currencyUnit,
                    return_line_groups: curr.returnLineGroups,
                    return_order_lines: curr.returnOrderLines,
                    return_channel_name: curr.returnChannel.channelName,
                    store_id: this.store_id,
                };
                const savedWFSOrderData =
                    await returnsRepository.save(returnsData);
                for (const returnOrderLine of curr.returnOrderLines) {
                    for (const charges of returnOrderLine.charges) {
                        const returnOrderLineData: Partial<ReturnCharges> = {
                            charge_category: charges.chargeCategory,
                            charge_name: charges.chargeName,
                            is_discount: charges.isDiscount,
                            is_billable: charges.isBillable,
                            currency_amount:
                                charges.chargePerUnit.currencyAmount,
                            currency_unit: charges.chargePerUnit.currencyUnit,
                            return_id: savedWFSOrderData.id,
                        };
                        for (const tax of charges.tax) {
                            returnOrderLineData.tax_name = tax.taxName;

                            returnOrderLineData.tax_currency_amount =
                                tax.excessTax.currencyAmount;

                            returnOrderLineData.tax_currency_unit =
                                tax.excessTax.currencyUnit;

                            returnOrderLineData.tax_tax_per_unit_currency_amount =
                                tax.taxPerUnit.currencyAmount;

                            returnOrderLineData.tax_tax_per_unit_currency_unit =
                                tax.taxPerUnit.currencyUnit;
                        }
                        returnChargesRepository.save(returnOrderLineData);
                        // console.log("currency_amount >>---> : ",charges.chargePerUnit.currencyAmount); //11
                        // console.log("currency_unit >>---> : ",charges.chargePerUnit.currencyUnit); //12
                    }
                    // returnsData.id
                }
            });
        }
        return {};
    }
}
