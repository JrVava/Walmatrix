import { WallmartClients } from '../modules/WallmartClients';
import moment from 'moment';
import { Orders, UsersSettings } from '../entity/Index';
import { OrderCharges } from '../entity/OrderCharges';

export class WallmartOrderController extends WallmartClients {
    public schema_name: string | null = null;
    public store_id: number | null = null;
    public user_setting_id: number;
    constructor() {
        super();
    }

    async getWFSWallMartOrders() {
        const allWFSOrders = [];
        const currentDate = moment();
        const last180Days = currentDate.subtract(179, 'days').toISOString();
        const publicConnection = await this.publicConnection();
        const userSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const userSetting = await userSettingRepository.findOne({
            where: { id: this.user_setting_id },
        });
        let date;
        if (userSetting.order_wfs_sync_date === null) {
            date = last180Days;
        } else {
            date = userSetting.order_wfs_sync_date;
        }
        const orders = await this.getOrders(date, 'WFSFulfilled', null);

        let nextPage = orders.list.meta.nextCursor;
        allWFSOrders.push(orders.list.elements.order);

        if (orders.list.meta.totalCount > orders.list.meta.limit) {
            const totalPages = Math.ceil(
                orders.list.meta.totalCount / orders.list.meta.limit,
            );

            for (let index = 1; index < totalPages; index++) {
                const orderss = await this.getOrders(null, null, nextPage);
                if (orderss.list !== undefined) {
                    nextPage = orderss.list.meta.nextCursor;
                    allWFSOrders.push(orderss.list.elements.order);
                }
            }
        }

        await userSettingRepository.update(
            { id: this.user_setting_id },
            {
                order_wfs_sync_date: moment()
                    .subtract(7, 'hours')
                    .toISOString(),
            },
        );
        this.storeOrderDate(allWFSOrders);
        return { message: 'Order Details saved successfully' };
    }

    async getSellerWallMartOrders() {
        const publicConnection = await this.publicConnection();
        const allWFSOrders = [];
        const currentDate = moment();
        const last180Days = currentDate.subtract(179, 'days').toISOString();
        // console.log("last180Days >>---> : ",last180Days);
        // return {}
        const userSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const userSetting = await userSettingRepository.findOne({
            where: { id: this.user_setting_id },
        });
        let date;
        if (userSetting.order_seller_sync_date === null) {
            date = last180Days;
        } else {
            date = userSetting.order_seller_sync_date;
        }
        const orders = await this.getOrders(date, 'SellerFulfilled', null);

        let nextPage = orders.list.meta.nextCursor;
        allWFSOrders.push(orders.list.elements.order);

        if (orders.list.meta.totalCount > orders.list.meta.limit) {
            const totalPages = Math.ceil(
                orders.list.meta.totalCount / orders.list.meta.limit,
            );

            for (let index = 1; index < totalPages; index++) {
                const orderss = await this.getOrders(null, null, nextPage);

                if (orderss.list !== undefined) {
                    nextPage = orderss.list.meta.nextCursor;
                    allWFSOrders.push(orderss.list.elements.order);
                }
            }
        }
        await userSettingRepository.update(
            { id: this.user_setting_id },
            {
                order_seller_sync_date: moment()
                    .subtract(7, 'hours')
                    .toISOString(),
            },
        );
        this.storeOrderDate(allWFSOrders);
        return { message: 'Order Details saved successfully' };
    }

    async getPLFulfilledWallMartOrders() {
        const allWFSOrders = [];
        const currentDate = moment();
        const last180Days = currentDate.subtract(179, 'days').toISOString();
        const publicConnection = await this.publicConnection();
        const userSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const userSetting = await userSettingRepository.findOne({
            where: { id: this.user_setting_id },
        });
        let date;
        if (userSetting.order_plfulfilled_sync_date === null) {
            date = last180Days;
        } else {
            date = userSetting.order_plfulfilled_sync_date;
        }

        const orders = await this.getOrders(date, '3PLFulfilled', null);

        let nextPage = orders.list.meta.nextCursor;
        allWFSOrders.push(orders.list.elements.order);

        if (orders.list.meta.totalCount > orders.list.meta.limit) {
            const totalPages = Math.ceil(
                orders.list.meta.totalCount / orders.list.meta.limit,
            );

            for (let index = 1; index < totalPages; index++) {
                const orderss = await this.getOrders(null, null, nextPage);

                if (orderss.list !== undefined) {
                    nextPage = orderss.list.meta.nextCursor;
                    allWFSOrders.push(orderss.list.elements.order);
                }
            }
        }
        await userSettingRepository.update(
            { id: this.user_setting_id },
            {
                order_plfulfilled_sync_date: moment()
                    .subtract(7, 'hours')
                    .toISOString(),
            },
        );
        this.storeOrderDate(allWFSOrders);

        return { message: 'Order Details saved successfully' };
    }

    async storeOrderDate(allWFSOrders = []) {
        const ordersRepository = (
            await this.connection(this.schema_name)
        ).getRepository(Orders);
        const ordersChargesRepository = (
            await this.connection(this.schema_name)
        ).getRepository(OrderCharges);
        for (const ordersData of allWFSOrders) {
            ordersData.map(async (curr) => {
                const checkOrderExist = await ordersRepository.findOne({
                    where: { purchase_order_id: curr.purchaseOrderId },
                });
                let savedOrderId: number;
                const formattedDate = moment
                    .unix(curr.orderDate / 1000)
                    .format('YYYY-MM-DD');

                if (checkOrderExist !== null) {
                    // update order
                    const ordersData: Partial<Orders> = {
                        customer_email_id: curr.customerEmailId,
                        purchase_order_id: curr.purchaseOrderId,
                        customer_order_id: curr.customerOrderId,
                        order_date: curr.orderDate,
                        shipping_info: curr.shippingInfo,
                        order_lines: curr.orderLines,
                        ship_node: curr.shipNode?.type,
                        store_id: this.store_id,
                        formated_date: formattedDate,
                    };
                    await ordersRepository.update(
                        checkOrderExist.id,
                        ordersData,
                    );
                    savedOrderId = checkOrderExist.id;
                } else {
                    // add order
                    const ordersData: Partial<Orders> = {
                        customer_email_id: curr.customerEmailId,
                        purchase_order_id: curr.purchaseOrderId,
                        customer_order_id: curr.customerOrderId,
                        order_date: curr.orderDate,
                        shipping_info: curr.shippingInfo,
                        order_lines: curr.orderLines,
                        ship_node: curr.shipNode?.type,
                        store_id: this.store_id,
                        formated_date: formattedDate,
                    };
                    const savedWFSOrderData =
                        await ordersRepository.save(ordersData);
                    savedOrderId = savedWFSOrderData.id;
                }

                for (const orderLine of curr.orderLines.orderLine) {
                    const chargeAmounts = orderLine.charges.charge;
                    const checkOrderChargeExist =
                        await ordersChargesRepository.findOne({
                            where: {
                                order_id: savedOrderId,
                                order_line_number: orderLine.lineNumber,
                                sku: orderLine.item.sku,
                                purchase_order_id: curr.purchaseOrderId,
                            },
                        });
                    for (const amountCharge of chargeAmounts) {
                        // add order charge added for temporary based due having issue with total sales
                        const orderLineData: Partial<OrderCharges> = {
                            product_amount: amountCharge.chargeAmount.amount,
                            order_tax:
                                amountCharge.tax === null
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

                        for (const statuses of orderLine.orderLineStatuses
                            ?.orderLineStatus) {
                            orderLineData.order_status = statuses.status;
                        }
                        await ordersChargesRepository.save(orderLineData);
                    }
                }
            });
        }
    }
}
