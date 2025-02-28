import WallmartOrderLine from './orderLineInterface';
import WallmartShippingInfo from './shippingInfoInterface';

export interface Wallmart_orders
    extends WallmartShippingInfo,
        WallmartOrderLine {
    purchaseOrderId: string;
    customerOrderId: string;
    customerEmailId: string;
    orderType: string;
    originalCustomerOrderID: string;
    orderDate: number;
}
