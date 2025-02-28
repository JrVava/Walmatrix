export default interface WallmartOrderLineStatuses {
    orderLineStatuses: {
        orderLineStatuses: Array<{
            status: string;
            statusQuantity: {
                unitOfMeasurement: string;
                amount: string;
            };
        }>;
    };
}
