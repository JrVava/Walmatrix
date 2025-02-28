"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallmartController = void 0;
const WallmartClients_1 = require("../modules/WallmartClients");
// import { Products } from "../entity/Index";
// @JsonController("/wallmart")
// @UseBefore(loggingMiddleware)
class WallmartController extends WallmartClients_1.WallmartClients {
    constructor() {
        super();
        this.schema_name = null;
        this.store_id = null;
        this.defaultPage = 1;
    }
    // private wallmartClients: WallmartClients = new WallmartClients();
    // @Get('/get-wallmart-products-list')
    // async storeProducts(defaultPage: number = this.defaultPage) {
    //     console.log("Store ID :->> ",this.store_id);
    //     try {
    //         const wallmartRepository = (await this.connection(this.schema_name)).getRepository(Products);
    //         const products = await this.getItems(defaultPage);
    //         console.log("defaultPage ",defaultPage);
    //         if (products["totalItems"] === 0) {
    //             await this.delay(1000);
    //             console.log("No products available, retrying...");
    //             return await this.storeProducts(defaultPage); // Recursive call to retry fetching products
    //         }
    //         const calculatedPagination = this.calculatePaginationItems(products["totalItems"]);
    //         for (let index = defaultPage; index <= calculatedPagination; index++) {
    //             let productCollection = await this.getItems(index);
    //             // console.log("productCollection", productCollection);
    //             if (productCollection["totalItems"] === 0) {
    //                 productCollection = await this.getItems(index);
    //                 console.log("Get Item", productCollection);
    //                 await this.delay(1000);
    //                 return await this.storeProducts(index); // Recursive call to retry fetching products
    //             }
    //             if (productCollection && productCollection["ItemResponse"]) {
    //                 const itemResponse = productCollection["ItemResponse"];
    //                 if (Array.isArray(itemResponse)) {
    //                     for (let count = 0; count < itemResponse.length; count++) {
    //                         const wallmartProduct = itemResponse[count];
    //                         // const productExist = await wallmartRepository.findOne({ where: { sku: product.sku, mart: product.mart } });
    //                         const products:Partial<Products> = {
    //                             mart:wallmartProduct.mart,
    //                             sku:wallmartProduct.sku,
    //                             wpid:wallmartProduct.wpid,
    //                             upc:wallmartProduct.upc,
    //                             gtin:wallmartProduct.gtin,
    //                             product_name:wallmartProduct.productName,
    //                             shelf:wallmartProduct.shelf,
    //                             product_type:wallmartProduct.productType,
    //                             price:wallmartProduct.price,
    //                             published_status:wallmartProduct.publishedStatus,
    //                             lifecycle_status:wallmartProduct.lifecycleStatus,
    //                             unpublished_reasons:wallmartProduct.unpublishedReasons ? wallmartProduct.unpublishedReasons : '{}',
    //                             variants_group_id:wallmartProduct.variantGroupId ? wallmartProduct.variantGroupId : '',
    //                             variants_group_info:wallmartProduct.variantGroupInfo ? wallmartProduct.variantGroupInfo : '{}',
    //                             store_id:this.store_id
    //                         }
    //                         const saveProducts=wallmartRepository.create(products);
    //                         await wallmartRepository.save(saveProducts);
    //                         // if (!productExist) {
    //                         //     console.log("product recorded", product.sku);
    //                         //     await wallmartRepository.save(product);
    //                         // }else{
    //                         //     console.log("productExist ", productExist.sku);
    //                         // }
    //                     }
    //                 } else {
    //                     console.log("ItemResponse is not an array", index);
    //                 }
    //             } else {
    //                 console.log("Invalid productCollection or missing ItemResponse", productCollection);
    //             }
    //         }
    //         console.log("Product Collection saved successfully");
    //         return "Product Collection saved successfully";
    //     } catch (e) {
    //         // console.log(e)
    //         // if(e.response.status === 520){
    //         //     return await this.storeProducts(this.defaultPage);
    //         // }
    //         console.log("Error occurs in the Wallmart Controller: ", e);
    //     }
    // }
    calculatePaginationItems(totalItems) {
        const calculatedPages = Math.ceil(totalItems / 10);
        return calculatedPages;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.WallmartController = WallmartController;
//# sourceMappingURL=WallmartController.js.map