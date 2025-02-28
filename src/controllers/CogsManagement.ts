import {
    Body,
    JsonController,
    Post,
    UploadedFile,
    Res,
    UseBefore,
} from 'routing-controllers';

import { DataSourceConnection } from '../connection';
import { CogsEntity, Products, StoreConfig } from '../entity/Index';
import { loggingMiddleware } from '../service/loggingMiddleware';
import { Response } from 'express';
import csvParser from 'csv-parser';

@JsonController('/cogs')
@UseBefore(loggingMiddleware)
export class Cogs extends DataSourceConnection {
    @Post('/store')
    async storeCogs(
        @Body() cogsData: Partial<CogsEntity>,
        @Res() res: Response,
    ) {
        const publicConnection = await this.publicConnection();
        const store_id = cogsData['store_id'];
        const { id, amount, product_id, start, end } = cogsData;
        let cogsId = id;
        if (store_id) {
            const storeConfigRepository =
                publicConnection.getRepository(StoreConfig);
            const getStore = await storeConfigRepository.findOne({
                where: { id: store_id },
            });
            if (getStore) {
                const schema_name = `default_${getStore.user_id}`;
                const productRepository = (
                    await this.connection(schema_name)
                ).getRepository(Products);
                const cogsRepository = (
                    await this.connection(schema_name)
                ).getRepository(CogsEntity);
                const checkProductExist = await productRepository.findOne({
                    where: { id: product_id },
                });
                if (checkProductExist) {
                    if (id) {
                        await cogsRepository.update(
                            { id: cogsId },
                            {
                                amount: amount,
                                product_id: product_id,
                                start: start,
                                end: end,
                            },
                        );
                    } else {
                        const cogsSaveData = await cogsRepository.save({
                            amount: amount,
                            product_id: product_id,
                            start: start,
                            end: end,
                        });
                        cogsId = cogsSaveData.id;
                    }
                    const cogs = await cogsRepository.findOne({
                        where: { id: cogsId },
                    });
                    return res.status(200).send({
                        message: 'Cogs saved successfully.',
                        data: cogs,
                    });
                } else {
                    return res
                        .status(404)
                        .send({ message: 'Sorry, Product does not exist.' });
                }
            } else {
                return res
                    .status(404)
                    .send({ message: 'Sorry, Store not found.' });
            }
        } else {
            return res
                .status(404)
                .send({ message: 'Sorry, Store Id is requird.' });
        }
    }

    @Post('/csv-upload')
    async cogCSVUpload(
        @UploadedFile('file') file: Express.Multer.File,
        @Res() res: Response,
        @Body() dataObj,
    ) {
        const publicConnection = await this.publicConnection();
        const store_id = dataObj.store_id;
        if (store_id) {
            const storeConfigRepository =
                publicConnection.getRepository(StoreConfig);

            const getStore = await storeConfigRepository.findOne({
                where: { id: store_id },
            });

            const schema_name = `default_${getStore.user_id}`;

            const cogsRepository = (
                await this.connection(schema_name)
            ).getRepository(CogsEntity);

            try {
                if (!file || !file.buffer) {
                    return res
                        .status(404)
                        .send({ message: 'Sorry, No file uploaded.' });
                }
                const data = [];
                const fileBuffer = file.buffer.toString();
                // Parse CSV data from the file buffer
                csvParser({ separator: ',' })
                    .on('data', (row) => {
                        data.push(row);
                    })
                    .write(fileBuffer);
                // console.log("data", data);
                data.map(async (cogs) => {
                    const productId = await this.getProductID(
                        cogs['SKU'],
                        cogs['Item Id'],
                        store_id,
                        schema_name,
                    );

                    const checkCogs = await cogsRepository.findOne({
                        where: { product_id: productId },
                    });
                    const cogsData = {
                        amount: cogs['CoGs'],
                        product_id: productId,
                    };
                    if (checkCogs) {
                        cogsData['id'] = checkCogs.id;
                    }
                    await cogsRepository.save(cogsData);
                });
                return res
                    .status(200)
                    .send({ message: "COG's CSV data uploaded successfully." });
            } catch (error) {
                return res
                    .status(500)
                    .send({ message: 'Internal Server Error' });
            }
        } else {
            return res
                .status(404)
                .send({ message: 'Sorry, Store Id is requird.' });
        }
    }

    async getProductID(
        sku: string,
        item_id: number,
        store_id: number,
        schema_name: string,
    ) {
        const productRepository = (
            await this.connection(schema_name)
        ).getRepository(Products);
        const getProduct = await productRepository.findOne({
            where: {
                item_id: +item_id,
                sku: sku,
                store_id: +store_id,
            },
        });
        await (await this.connection(schema_name)).destroy();
        return getProduct ? getProduct.id : null;
    }
}
