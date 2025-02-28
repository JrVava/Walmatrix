import WallmartPostalAddress from './postalAddressInterface';

export default interface WallmartShippingInfo extends WallmartPostalAddress {
    shippingInfo: {
        phone: string;
        estimatedDeliveryDate: string;
        estimatedShipDate: number;
        methodCode: string;
    };
}
