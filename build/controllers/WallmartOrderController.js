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
exports.WallmartOrderController = void 0;
const WallmartClients_1 = require("../modules/WallmartClients");
const moment_1 = __importDefault(require("moment"));
const Index_1 = require("../entity/Index");
const OrderCharges_1 = require("../entity/OrderCharges");
class WallmartOrderController extends WallmartClients_1.WallmartClients {
    constructor() {
        super();
        this.schema_name = null;
        this.store_id = null;
    }
    getWFSWallMartOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            const allWFSOrders = [];
            const currentDate = (0, moment_1.default)();
            const last180Days = currentDate.subtract(179, 'days').toISOString();
            const userSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const userSetting = yield userSettingRepository.findOne({
                where: { id: this.user_setting_id },
            });
            let date;
            if (userSetting.order_wfs_sync_date === null) {
                date = last180Days;
            }
            else {
                date = userSetting.order_wfs_sync_date;
            }
            const orders = yield this.getOrders(date, 'WFSFulfilled', null);
            let nextPage = orders.list.meta.nextCursor;
            allWFSOrders.push(orders.list.elements.order);
            if (orders.list.meta.totalCount > orders.list.meta.limit) {
                const totalPages = Math.ceil(orders.list.meta.totalCount / orders.list.meta.limit);
                for (let index = 1; index < totalPages; index++) {
                    const orderss = yield this.getOrders(null, null, nextPage);
                    if (orderss.list !== undefined) {
                        nextPage = orderss.list.meta.nextCursor;
                        allWFSOrders.push(orderss.list.elements.order);
                    }
                }
            }
            yield userSettingRepository.update({ id: this.user_setting_id }, {
                order_wfs_sync_date: (0, moment_1.default)()
                    .subtract(7, 'hours')
                    .toISOString(),
            });
            this.storeOrderDate(allWFSOrders);
            return { message: 'Order Details saved successfully' };
        });
    }
    getSellerWallMartOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            const allWFSOrders = [];
            const currentDate = (0, moment_1.default)();
            const last180Days = currentDate.subtract(179, 'days').toISOString();
            // console.log("last180Days >>---> : ",last180Days);
            // return {}
            const userSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const userSetting = yield userSettingRepository.findOne({
                where: { id: this.user_setting_id },
            });
            let date;
            if (userSetting.order_seller_sync_date === null) {
                date = last180Days;
            }
            else {
                date = userSetting.order_seller_sync_date;
            }
            const orders = yield this.getOrders(date, 'SellerFulfilled', null);
            let nextPage = orders.list.meta.nextCursor;
            allWFSOrders.push(orders.list.elements.order);
            if (orders.list.meta.totalCount > orders.list.meta.limit) {
                const totalPages = Math.ceil(orders.list.meta.totalCount / orders.list.meta.limit);
                for (let index = 1; index < totalPages; index++) {
                    const orderss = yield this.getOrders(null, null, nextPage);
                    if (orderss.list !== undefined) {
                        nextPage = orderss.list.meta.nextCursor;
                        allWFSOrders.push(orderss.list.elements.order);
                    }
                }
            }
            yield userSettingRepository.update({ id: this.user_setting_id }, {
                order_seller_sync_date: (0, moment_1.default)()
                    .subtract(7, 'hours')
                    .toISOString(),
            });
            this.storeOrderDate(allWFSOrders);
            return { message: 'Order Details saved successfully' };
        });
    }
    getPLFulfilledWallMartOrders() {
        return __awaiter(this, void 0, void 0, function* () {
            const allWFSOrders = [];
            const currentDate = (0, moment_1.default)();
            const last180Days = currentDate.subtract(179, 'days').toISOString();
            const userSettingRepository = (yield this.publicConnection()).getRepository(Index_1.UsersSettings);
            const userSetting = yield userSettingRepository.findOne({
                where: { id: this.user_setting_id },
            });
            let date;
            if (userSetting.order_plfulfilled_sync_date === null) {
                date = last180Days;
            }
            else {
                date = userSetting.order_plfulfilled_sync_date;
            }
            const orders = yield this.getOrders(date, '3PLFulfilled', null);
            let nextPage = orders.list.meta.nextCursor;
            allWFSOrders.push(orders.list.elements.order);
            if (orders.list.meta.totalCount > orders.list.meta.limit) {
                const totalPages = Math.ceil(orders.list.meta.totalCount / orders.list.meta.limit);
                for (let index = 1; index < totalPages; index++) {
                    const orderss = yield this.getOrders(null, null, nextPage);
                    if (orderss.list !== undefined) {
                        nextPage = orderss.list.meta.nextCursor;
                        allWFSOrders.push(orderss.list.elements.order);
                    }
                }
            }
            yield userSettingRepository.update({ id: this.user_setting_id }, {
                order_plfulfilled_sync_date: (0, moment_1.default)()
                    .subtract(7, 'hours')
                    .toISOString(),
            });
            this.storeOrderDate(allWFSOrders);
            return { message: 'Order Details saved successfully' };
        });
    }
    storeOrderDate(allWFSOrders = []) {
        return __awaiter(this, void 0, void 0, function* () {
            const ordersRepository = (yield this.connection(this.schema_name)).getRepository(Index_1.Orders);
            const ordersChargesRepository = (yield this.connection(this.schema_name)).getRepository(OrderCharges_1.OrderCharges);
            for (const ordersData of allWFSOrders) {
                ordersData.map((curr) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    const checkOrderExist = yield ordersRepository.findOne({
                        where: { purchase_order_id: curr.purchaseOrderId },
                    });
                    let savedOrderId;
                    const formattedDate = moment_1.default
                        .unix(curr.orderDate / 1000)
                        .format('YYYY-MM-DD');
                    if (checkOrderExist !== null) {
                        // update order
                        const ordersData = {
                            customer_email_id: curr.customerEmailId,
                            purchase_order_id: curr.purchaseOrderId,
                            customer_order_id: curr.customerOrderId,
                            order_date: curr.orderDate,
                            shipping_info: curr.shippingInfo,
                            order_lines: curr.orderLines,
                            ship_node: (_a = curr.shipNode) === null || _a === void 0 ? void 0 : _a.type,
                            store_id: this.store_id,
                            formated_date: formattedDate,
                        };
                        yield ordersRepository.update(checkOrderExist.id, ordersData);
                        savedOrderId = checkOrderExist.id;
                    }
                    else {
                        // add order
                        const ordersData = {
                            customer_email_id: curr.customerEmailId,
                            purchase_order_id: curr.purchaseOrderId,
                            customer_order_id: curr.customerOrderId,
                            order_date: curr.orderDate,
                            shipping_info: curr.shippingInfo,
                            order_lines: curr.orderLines,
                            ship_node: (_b = curr.shipNode) === null || _b === void 0 ? void 0 : _b.type,
                            store_id: this.store_id,
                            formated_date: formattedDate,
                        };
                        const savedWFSOrderData = yield ordersRepository.save(ordersData);
                        savedOrderId = savedWFSOrderData.id;
                    }
                    for (const orderLine of curr.orderLines.orderLine) {
                        const chargeAmounts = orderLine.charges.charge;
                        const checkOrderChargeExist = yield ordersChargesRepository.findOne({
                            where: {
                                order_id: savedOrderId,
                                order_line_number: orderLine.lineNumber,
                                sku: orderLine.item.sku,
                                purchase_order_id: curr.purchaseOrderId,
                            },
                        });
                        for (const amountCharge of chargeAmounts) {
                            // add order charge added for temporary based due having issue with total sales
                            const orderLineData = {
                                product_amount: amountCharge.chargeAmount.amount,
                                order_tax: amountCharge.tax === null
                                    ? null
                                    : amountCharge.tax.taxAmount.amount,
                                purchase_order_id: curr.purchaseOrderId,
                                customer_order_id: curr.customerOrderId,
                                order_id: savedOrderId,
                                charge_type: amountCharge.chargeType,
                                order_line_number: orderLine.lineNumber,
                                sku: orderLine.item.sku,
                            };
                            if (checkOrderChargeExist) {
                                orderLineData.id = checkOrderChargeExist.id;
                            }
                            for (const statuses of (_c = orderLine.orderLineStatuses) === null || _c === void 0 ? void 0 : _c.orderLineStatus) {
                                orderLineData.order_status = statuses.status;
                            }
                            yield ordersChargesRepository.save(orderLineData);
                        }
                    }
                }));
            }
        });
    }
}
exports.WallmartOrderController = WallmartOrderController;
//# sourceMappingURL=WallmartOrderController.js.map