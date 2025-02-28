import WallmartOrderLineCharges from './chargesInterface';
import WallmartFulFillment from './fulfillmentInterface';
import WallmartOrderLineItem from './itemInterface';
import WallmartOrderLineQuntity from './orderLineQuantityInterface';
import WallmartOrderLineStatuses from './orderLineStatusesInterface';

export default interface WallmartOrderLine
    extends WallmartOrderLineCharges,
        WallmartOrderLineQuntity,
        WallmartOrderLineStatuses,
        WallmartFulFillment,
        WallmartOrderLineItem {
    orderLines: {
        orderLine: Array<{
            lineNumber: string;
            value: string;
            statusDate: number;
        }>;
    };
}
