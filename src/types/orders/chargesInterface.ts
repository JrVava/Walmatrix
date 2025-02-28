export default interface WallmartOrderLineCharges {
    charges: {
        charges: Array<{
            chargeType: string;
            chargeName: string;
            chargeAmount: {
                currency: string;
                amount: number;
            };
            tax: {
                taxName: string;
                taxAmount: {
                    currency: string;
                    amount: number;
                };
            };
        }>;
    };
}
