import { Queue, Worker, Job } from 'bullmq';
import redisClient from '../modules/RedisClient';
import fs, { createWriteStream } from 'fs';
import axios from 'axios';
import path from 'path';
import unzipper from 'unzipper';
import { pipeline } from 'stream';
import { promisify } from 'util';
import {
    AdvertiserReports,
    Products,
    Recon,
    ReconManagement,
} from '../entity/Index';
import { DataSourceConnection } from '../connection';
import { WallmartOrderController } from '../controllers/WallmartOrderController';
import { Scrapper } from '../controllers/scrapperController';
import logger, { scrapperLogger } from './logger';
import { WallmartClients } from '../modules/WallmartClients';
import moment from 'moment';
import { AwsService } from './awsService';
import { streamToString } from '../modules/utils';
import { config } from '../config';
import puppeteer from 'puppeteer';
import AdmZip from 'adm-zip';
const asyncPipeline = promisify(pipeline);
export const wallmartQueue = new Queue('wallmart', {
    connection: redisClient.duplicate(),
});

export const reconQueue = new Queue('recon', {
    connection: redisClient.duplicate(),
});

export const advertiserQueue = new Queue('advertiser', {
    connection: redisClient.duplicate(),
});

export const wallmartWorker = new Worker(
    'wallmart',
    async (job: Job) => {
        const wallmart = new WallmartOrderController();
        wallmart.clientId = job.data.client_id;
        wallmart.clientSecret = job.data.client_secret;
        wallmart.schema_name = job.data.schema_name;
        wallmart.store_id = job.data.store_id;
        wallmart.user_setting_id = job.data.user_setting_id;

        if (job.name == 'download-item-report') {
            const filePath = path.join(
                __dirname,
                `../../dist/${job.data.store_id}/${job.data.user_id}/item-report`,
            );

            if (!fs.existsSync(filePath)) {
                fs.mkdir(filePath, { recursive: true }, (err) => {
                    return err;
                });
            }

            const response = await axios.get(job.data.requestURL, {
                responseType: 'stream',
            });

            const fileName = `${filePath}/${job.data.schema_name}-${job.data.store_id}.zip`;
            // return {}
            const writeStream = createWriteStream(fileName);
            await asyncPipeline(response.data, writeStream);

            const zip = new AdmZip(fileName);
            const extractedFile = zip.getEntries();
            const newName = `${job.data.schema_name}-${job.data.store_id}.csv`;
            extractedFile[0].entryName = newName;
            // Below we extract the zip file
            zip.extractAllTo(filePath, true);

            fs.unlink(fileName, (err) => {
                logger.info(err);
            });
            const csvFileWithPath = `${filePath}/${newName}`;
            const awsService = new AwsService();
            const awsResult = await awsService.uploadToS3(
                `${job.data.store_id}/${job.data.user_id}/item-report/${newName}`,
                csvFileWithPath,
            );
            if (awsResult.result.$metadata.httpStatusCode === 200) {
                fs.unlink(csvFileWithPath, (err) => {
                    logger.info(err);
                });
            }
            const awsFilePath = `${job.data.store_id}/${job.data.user_id}/item-report/${newName}`;
            const s3Response = await awsService.readCSV(awsFilePath);
            const bodyContents = await streamToString(s3Response.Body);
            const csvDatas: any = await bodyContents;

            const allResults: { csvData: object[][]; schemaDetails: object[] } =
                {
                    csvData: [],
                    schemaDetails: [],
                };
            allResults.csvData.push(csvDatas);
            allResults.schemaDetails.push({
                schema_name: job.data.schema_name,
                store_id: job.data.store_id,
            });

            for (
                let index = 0;
                index < allResults.schemaDetails.length;
                index++
            ) {
                const schema_name =
                    allResults.schemaDetails[index]['schema_name'];
                const store_id = allResults.schemaDetails[index]['store_id'];
                const fileData = allResults.csvData[index];
                const connection = new DataSourceConnection();
                const productRepository = (
                    await connection.connection(schema_name)
                ).getRepository(Products);

                for (const data of fileData) {
                    const checkProductExit = await productRepository
                        .createQueryBuilder('product')
                        .select('product.id', 'id')
                        .where('product.sku = :sku', { sku: data['SKU'] })
                        .andWhere('product.item_id = :item_id', {
                            item_id: data['Item ID'],
                        })
                        // .andWhere('product.gtin = :gtin', {
                        //     gtin: data['GTIN'],
                        // })
                        .andWhere('product.store_id = :store_id', {
                            store_id: store_id,
                        })
                        .getRawOne();

                    const productData = {
                        sku: data['SKU'],
                        item_id:
                            data['Item ID'] === ''
                                ? 0
                                : parseFloat(data['Item ID']),
                        product_name: data['Product Name'],
                        lifecycle_status: data['Lifecycle Status'],
                        publish_status: data['Publish Status'],
                        status_change_reason: data['Status Change Reason'],
                        product_category: data['Product Category'],
                        price:
                            data['Price'] === ''
                                ? 0
                                : parseFloat(data['Price']),
                        currency: data['Currency'],
                        buy_box_item_price:
                            data['Buy Box Item Price'] === ''
                                ? 0
                                : parseFloat(data['Buy Box Item Price']),
                        buy_box_shipping_price:
                            data['Buy Box Shipping Price'] === ''
                                ? 0
                                : parseFloat(data['Buy Box Shipping Price']),
                        msrp:
                            data['MSRP'] === '' ? 0 : parseFloat(data['MSRP']),
                        product_tax_code: data['Product Tax Code'],
                        ship_methods: data['Ship Methods'],
                        shipping_weight: data['Shipping Weight'],
                        shipping_weight_unit: data['Shipping Weight Unit'],
                        fulfillment_lag_time: data['Fulfillment Lag Time'],
                        fulfillment_type: data['Fulfillment Type'],
                        wfs_sales_restriction: data['WFS Sales Restriction'],
                        wpid: data['WPID'],
                        gtin: parseInt(data['GTIN']).toString(),
                        upc: data['UPC'],
                        item_page_url: data['Item Page URL'],
                        primary_image_url: data['Primary Image URL'],
                        shelf_name: data['Shelf Name'],
                        primary_category_path: data['Primary Category Path'],
                        brand: data['Brand'],
                        offer_start_date: data['Offer Start Date'],
                        offer_end_date: data['Offer End Date'],
                        item_creation_date: data['Item Creation Date'],
                        item_last_updated: data['Item Last Updated'],
                        reviews_count:
                            data['Reviews Count'] === ''
                                ? 0
                                : parseFloat(data['Reviews Count']),
                        average_rating:
                            data['Average Rating'] === ''
                                ? 0
                                : parseFloat(data['Average Rating']),
                        searchable: data['Searchable?'],
                        variant_group_id: data['Variant Group Id'],
                        primary_variant: data['Primary Variant?'],
                        variant_grouping_attributes:
                            data['Variant Grouping Attributes'],
                        variant_grouping_values:
                            data['Variant Grouping Values'],
                        competitor_url: data['Competitor URL'],
                        competitor_price:
                            data['Competitor Price'] === ''
                                ? 0
                                : parseFloat(data['Competitor Price']),
                        competitor_ship_price:
                            data['Competitor Ship Price'] === ''
                                ? 0
                                : parseFloat(data['Competitor Ship Price']),
                        competitor_last_date_fetched:
                            data['Competitor Last Date Fetched'],
                        repricer_strategy: data['Repricer Strategy'],
                        minimum_seller_allowed_price:
                            data['Minimum Seller Allowed Price'],
                        maximum_seller_allowed_price:
                            data['Maximum Seller Allowed Price'],
                        repricer_status: data['Repricer Status'],
                        store_id: store_id,
                    };

                    // console.log("productData", productData);
                    if (checkProductExit) {
                        productData['id'] = checkProductExit.id;
                    }
                    // console.log('productData', productData);
                    // console.log('schema_name', schema_name);
                    await productRepository.save(productData);
                    // if (checkProductExit) {
                    //     // console.log("checkProductExit",checkProductExit);
                    //     await productRepository.update(
                    //         { id: checkProductExit.id },
                    //         productData,
                    //     );
                    // } else {
                    //     await productRepository.save(productData);
                    // }
                }
                (await connection.connection(schema_name)).destroy();
                // await productRepository.save(result, { chunk: 30 });
                // await productRepository.upsert(result,["sku","item_id","gtin","store_id"])
            }
        }

        if (job.name == 'getWFSOrder') {
            await wallmart.getWFSWallMartOrders();
        }

        if (job.name == 'getSellerOrder') {
            await wallmart.getSellerWallMartOrders();
        }

        if (job.name == 'getPLulfilledOrder') {
            await wallmart.getPLFulfilledWallMartOrders();
        }
        return 'Success';
    },
    { connection: redisClient },
);

export const downloadAdvertiserReportWorker = new Worker(
    'advertiser',
    async (job: Job) => {
        if (job.name == 'downloadItemPerformance') {
            scrapperLogger.info(
                '=========================== JOB STARTED========================',
            );
            // const dirName = `./dist/${job.data.store_id}/${job.data.user_id}`;
            const dirName = path.join(
                __dirname,
                `../../dist/${job.data.store_id}/${job.data.user_id}`,
            );
            let browser = null;
            try {
                scrapperLogger.info(
                    'Advertiser Download downloadItemPerformance Queue start',
                );

                if (!fs.existsSync(dirName)) {
                    scrapperLogger.info('Creating File');
                    fs.mkdir(dirName, { recursive: true }, (err) => {
                        return err;
                    });
                }

                scrapperLogger.info('Created File');

                const getConfig = config.advertiserCredentials;

                if (config.env === 'DEV') {
                    browser = await puppeteer.launch({ headless: false });
                } else if (config.env === 'PRODUCTION') {
                    browser = await puppeteer.launch({
                        headless: 'new',
                        timeout: 0,
                        args: ['--no-sandbox'],
                    });
                }

                const page = await browser.newPage();
                await page.setViewport({ width: 1366, height: 768 });
                await page.goto('https://advertising.walmart.com/signin', {
                    waitUntil: 'networkidle2',
                });

                const elements = await page.$$('.panel-button');
                let i = 0;
                elements.forEach(async (element) => {
                    if (i == 1) {
                        await element.click();
                    }
                    i = i + 1;
                });

                await page.waitForNavigation({ waitUntil: 'networkidle2' });

                const usernameInput =
                    await page.waitForSelector('input[type=text]');
                if (!usernameInput) {
                    throw new Error('Username input not found');
                }
                await usernameInput.type(getConfig.user_id);

                const passwordInput = await page.waitForSelector(
                    'input[type=password]',
                );
                if (!passwordInput) {
                    throw new Error('Password input not found');
                }
                await passwordInput.type(getConfig.password);

                const elements2 = await page.$$('.app-btn');
                elements2.forEach(async (element) => {
                    await element.click();
                });

                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                scrapperLogger.info('LOGIN DONE');

                scrapperLogger.info('BEFORE DOWNLOAD ON SPECIFIC PATH');

                const client = await page.target().createCDPSession();
                await client.send('Page.setDownloadBehavior', {
                    behavior: 'allow',
                    downloadPath: dirName,
                });
                await page.goto(job.data.csv_url);
            } catch (error) {
                scrapperLogger.info('Catch blocked hit');
                scrapperLogger.info('An error occurred:', error);
            }
            setTimeout(async () => {
                if (browser != null) {
                    scrapperLogger.info('Browser is closing.');
                    await browser.close();
                }
                browser = null;
            }, 2000);
        }

        if (job.name === 'generateReport') {
            // console.log("advertiserData----->", job.data)
            const scrapperClass = new Scrapper();
            // const page = await scrapperClass.signIn();
            await scrapperClass.requestReport(
                job.data.advertiserId,
                job.data.start_date,
                job.data.end_date,
                job.data.indexNumber,
                job.data.advertiserBatchId,
            );
        }
        if (job.name === 'moveToAWS') {
            const moveToAWS = job.data;
            const connection = new DataSourceConnection();
            const adReportRepository = (
                await connection.publicConnection()
            ).getRepository(AdvertiserReports);

            try {
                const awsService = new AwsService();
                await awsService.uploadToS3(
                    moveToAWS.awsMovePath,
                    moveToAWS.dirName,
                );
                adReportRepository.update(
                    { id: moveToAWS.advertiserid },
                    {
                        s3_status: moveToAWS.s3_status,
                    },
                );
                scrapperLogger.info(`AWS Path ${moveToAWS.awsMovePath}`);
                scrapperLogger.info(
                    `Local Directory Path ${moveToAWS.dirName}`,
                );
                // fs.unlink(job.data.moveToAWSObj.dirName, (err) => {
                //     logger.info(err);
                // });
            } catch (error) {
                scrapperLogger.info(
                    `Move to AWS QUEUE Function Error Encounter ${error}`,
                );
                scrapperLogger.info(
                    `AWS Error Encounter for advertise ID : ${moveToAWS.advertiserid}`,
                );
            }
        }

        return { message: 'success' };
    },
    {
        connection: redisClient,
        // maxStalledCount: 2,
        concurrency: 1,
        lockDuration: 120000,
    },
);

export const reconWorker = new Worker(
    'recon',
    async (job: Job) => {
        const wallmartClient = new WallmartClients();

        if (job.name == 'recon-available-date') {
            const connection = new DataSourceConnection();
            const reconManageRepository = (
                await connection.publicConnection()
            ).getRepository(ReconManagement);

            wallmartClient.clientId = job.data.clientId;
            wallmartClient.clientSecret = job.data.clientSecret;

            const getAvailableReconDate =
                await wallmartClient.availableReconFiles();
            if (
                getAvailableReconDate &&
                getAvailableReconDate.availableApReportDates
            ) {
                const availableReconData = [];
                for (const availableDate of getAvailableReconDate.availableApReportDates) {
                    const reconManageData: Partial<ReconManagement> = {
                        available_date: availableDate,
                        user_setting_id: job.data.user_setting_id,
                    };
                    const checkDataExist = await reconManageRepository.findOne({
                        where: {
                            user_setting_id: job.data.user_setting_id,
                            available_date: availableDate,
                        },
                    });
                    if (checkDataExist) {
                        reconManageData.id = checkDataExist.id;
                    }
                    availableReconData.push(reconManageData);
                }
                await reconManageRepository.save(availableReconData);
            }
        }
        if (job.name == 'download-recon-file') {
            wallmartClient.clientId = job.data.client_id;
            wallmartClient.clientSecret = job.data.client_secret;
            const available_date = job.data.available_date;
            const file_id = job.data.file_id;
            const store_id = job.data.store_id;
            const user_id = job.data.user_id;

            await wallmartClient.getReconReportCSV(
                available_date,
                store_id,
                user_id,
                file_id,
            );
        }

        if (job.name == 'read-recon-file') {
            const connection = new DataSourceConnection();
            const user_id = job.data.user_id;
            const filePath = job.data.file_path;
            const store_id = job.data.store_id;
            const file_id = job.data.file_id;
            const available_date = job.data.available_date;

            const reconRepository = (
                await connection.connection(`default_${user_id}`)
            ).getRepository(Recon);

            const awsService = new AwsService();
            const s3Response = await awsService.readCSV(filePath);
            const bodyContents: any = s3Response.Body;
            const readStream = bodyContents.pipe(unzipper.Parse());
            readStream.on('entry', async (entry) => {
                const bodyContents = await streamToString(entry);
                const csvDatas: any = await bodyContents;
                const result = await Promise.all(
                    csvDatas.map((data) => {
                        return {
                            period_start_date: !data['Period Start Date']
                                ? null
                                : data['Period Start Date'],
                            period_end_date: !data['Period End Date']
                                ? null
                                : data['Period End Date'],
                            total_payable: data['Total Payable']
                                ? parseFloat(data['Total Payable'])
                                : 0,
                            currency: data['Currency'],
                            transaction_key: data['Transaction Key'],
                            transaction_posted_timestamp: !!data[
                                'Transaction Posted Timestamp'
                            ]
                                ? moment(
                                      data['Transaction Posted Timestamp'],
                                      'MM/DD/YYYY',
                                  ).format('YYYY-MM-DD')
                                : null,
                            transaction_type: data['Transaction Type'],
                            transaction_description:
                                data['Transaction Description'],
                            customer_order: data['Customer Order #'],
                            customer_order_line: data['Customer Order line #']
                                ? parseFloat(data['Customer Order line #'])
                                : 0,
                            purchase_order: data['Purchase Order #'],
                            purchase_order_line: data['Purchase Order line #']
                                ? parseFloat(data['Purchase Order line #'])
                                : 0,
                            amount: data['Amount']
                                ? parseFloat(data['Amount'])
                                : 0,
                            amount_type: data['Amount Type'],
                            ship_qty: data['Ship Qty']
                                ? parseFloat(data['Ship Qty'])
                                : 0,
                            commission_rate: data['Commission Rate']
                                ? parseFloat(data['Commission Rate'])
                                : 0,
                            transaction_reason_description:
                                data['Transaction Reason Description'],
                            partner_item_id: data['Partner Item Id'],
                            partner_gtin: data['Partner GTIN']
                                ? parseInt(data['Partner GTIN']).toString()
                                : '',
                            partner_item_name: data['Partner Item Name'],
                            product_tax_code: data['Product Tax Code']
                                ? parseFloat(data['Product Tax Code'])
                                : 0,
                            ship_to_state: data['Ship to State'],
                            ship_to_city: data['Ship to City'],
                            ship_to_zipcode: data['Ship to Zipcode'],
                            contract_category: data['Contract Category'],
                            product_type: data['Product Type'],
                            commission_rule: data['Commission Rule'],
                            shipping_method: data['Shipping Method'],
                            fulfillment_type: data['Fulfillment Type'],
                            fulfillment_details: data['Fulfillment Details'],
                            original_commission: data['Original Commission']
                                ? parseFloat(data['Original Commission'])
                                : 0,
                            commission_incentive_program:
                                data['Commission Incentive Program'],
                            commission_saving: data['Commission Saving']
                                ? parseFloat(data['Commission Saving'])
                                : 0,
                            customer_promo_type: data['Customer Promo Type'],
                            total_walmart_funded_savings_program:
                                data['Total Walmart Funded Savings Program'],
                            campaign_id:
                                data['Campaign Id'] === undefined
                                    ? 0
                                    : parseFloat(data['Campaign Id']),
                            store_id: store_id,
                        };
                    }),
                );
                await reconRepository.save(result, { chunk: 100 });
            });
            const reconManageRepository = (
                await connection.publicConnection()
            ).getRepository(ReconManagement);

            await reconManageRepository.update(
                { id: file_id, available_date: available_date },
                { is_file_read: true },
            );
            (await connection.publicConnection()).destroy();
        }
    },
    { connection: redisClient },
);

// wallmartWorker.on('error', (err) => {
//     console.log("🚀 ~ file: queueService.ts:52 ~ wallmartWorker.on ~ err:", err)
// });

// wallmartWorker.on('progress', (job,pr) => {
//     console.log(`Worker Mesg: ${job.id} has completed.`);
//     console.log(`Worker Mesg: ${pr} has completed.`);
//     // done();
// });

// wallmartWorker.on('failed', (job,err) => {
//     console.log("err",err)
//     // console.log(`Worker Mesg: ${job.id} has completed.`);
//     // done();
// });

downloadAdvertiserReportWorker.on('completed', async (job) => {
    // console.log(job.name);
    if (job.name === 'downloadItemPerformance') {
        scrapperLogger.info('====================>', job.data);

        try {
            const connection = new DataSourceConnection();
            const adReportRepository = (
                await connection.publicConnection()
            ).getRepository(AdvertiserReports);
            const dirName = `dist/${job.data.store_id}/${job.data.user_id}`;
            const fileName = new URL(job.data.csv_url).searchParams.get(
                'fileName',
            );

            const updatedData: Partial<AdvertiserReports> = {
                downloaded_path: `${dirName}/${fileName}`,
                s3_status: 'Ready to move',
            };

            adReportRepository.update({ id: job.data.id }, updatedData);
        } catch (error) {
            scrapperLogger.info('Aws Error : ', error);
        }
    }
    scrapperLogger.info(`Job completed with result ${job.data}`);
});
// wallmartWorker.run()
