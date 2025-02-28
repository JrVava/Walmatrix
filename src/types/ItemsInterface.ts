import WallmartItemsPrice from './ItemPriceInterface';
import WallmartItemsVariant from './ItemsVariantGroupInterface';
export interface Wallmart_items
    extends WallmartItemsPrice,
        WallmartItemsVariant {
    ItemResponse: [
        {
            mart: string;
            sku: string;
            wpid: string;
            upc: string;
            gtin: string;
            productName: string;
            shelf: string;
            productType: string;
            publishedStatus: string;
            lifecycleStatus: string;
            variantGroupId: string;
            store_id: number;
        },
    ];
    totalItems: number;
    // variantGroupInfo: WallmartItemsVariant
}
