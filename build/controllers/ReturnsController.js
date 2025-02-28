"use strict";
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
exports.ReturnsController = void 0;
const WallmartClients_1 = require("../modules/WallmartClients");
const moment_1 = __importDefault(require("moment"));
const Index_1 = require("../entity/Index");
const logger_1 = __importDefault(require("../service/logger"));
class ReturnsController extends WallmartClients_1.WallmartClients {
    constructor() {
        super();
        this.schema_name = null;
        this.store_id = null;
    }
    returnWallmartData() {
        return __awaiter(this, void 0, void 0, function* () {
            // console.clear();
            const startDate = (0, moment_1.default)();
            const endDate = (0, moment_1.default)();
            const last180Days = startDate.subtract(179, 'days').toISOString();
            const userSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const userSetting = yield userSettingRepository.findOne({
                where: { id: this.user_setting_id },
            });
            let start;
            if (userSetting.return_sync_date === null) {
                start = last180Days;
            }
            else {
                start = userSetting.return_sync_date;
            }
            const returnDataArray = [];
            const returns = yield this.getReturn(start, endDate.toISOString(), null);
            let nextPage = returns.meta.nextCursor;
            returnDataArray.push(returns.returnOrders);
            if (nextPage) {
                const returnss = yield this.getReturn(null, null, nextPage);
                nextPage = returnss.meta.nextCursor;
                returnDataArray.push(returnss.returnOrders);
            }
            yield userSettingRepository.update({ id: this.user_setting_id }, { return_sync_date: endDate.toISOString() });
            this.storeReturnData(returnDataArray);
            return {};
        });
    }
    storeReturnData(returnDataArray = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const returnsRepository = (yield this.connection(this.schema_name)).getRepository(Index_1.Returns);
            const returnChargesRepository = (yield this.connection(this.schema_name)).getRepository(Index_1.ReturnCharges);
            for (const returnData of returnDataArray) {
                returnData.map((curr) => __awaiter(this, void 0, void 0, function* () {
                    // console.log("returnOrderId >>---> : ",curr.returnOrderId);
                    const checkReturnxist = yield returnsRepository.findOne({
                        where: { return_order_id: curr.returnOrderId },
                    });
                    if (checkReturnxist !== null) {
                        logger_1.default.info({ checkReturnExist: checkReturnxist.id });
                        return; // Skip saving the order if it already exists
                    }
                    const returnsData = {
                        return_order_id: curr.returnOrderId,
                        customer_email_id: curr.customerEmailId,
                        customer_name: curr.customerName,
                        customer_order_id: curr.customerOrderId,
                        return_order_date: curr.returnOrderDate,
                        return_by_date: curr.returnByDate,
                        refund_mode: curr.refundMode,
                        total_currency_amount: curr.totalRefundAmount.currencyAmount,
                        total_currency_unit: curr.totalRefundAmount.currencyUnit,
                        return_line_groups: curr.returnLineGroups,
                        return_order_lines: curr.returnOrderLines,
                        return_channel_name: curr.returnChannel.channelName,
                        store_id: this.store_id,
                    };
                    const savedWFSOrderData = yield returnsRepository.save(returnsData);
                    for (const returnOrderLine of curr.returnOrderLines) {
                        for (const charges of returnOrderLine.charges) {
                            const returnOrderLineData = {
                                charge_category: charges.chargeCategory,
                                charge_name: charges.chargeName,
                                is_discount: charges.isDiscount,
                                is_billable: charges.isBillable,
                                currency_amount: charges.chargePerUnit.currencyAmount,
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
                }));
            }
            return {};
        });
    }
}
exports.ReturnsController = ReturnsController;
//# sourceMappingURL=ReturnsController.js.map