"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconWorker = exports.downloadAdvertiserReportWorker = exports.wallmartWorker = exports.advertiserQueue = exports.reconQueue = exports.wallmartQueue = void 0;
const bullmq_1 = require("bullmq");
const RedisClient_1 = __importDefault(require("../modules/RedisClient"));
const fs_1 = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const unzipper_1 = __importDefault(require("unzipper"));
const stream_1 = require("stream");
const util_1 = require("util");
const Index_1 = require("../entity/Index");
const connection_1 = require("../connection");
const WallmartOrderController_1 = require("../controllers/WallmartOrderController");
const scrapperController_1 = require("../controllers/scrapperController");
const logger_1 = __importStar(require("./logger"));
const WallmartClients_1 = require("../modules/WallmartClients");
const moment_1 = __importDefault(require("moment"));
const awsService_1 = require("./awsService");
const utils_1 = require("../modules/utils");
const config_1 = require("../config");
const puppeteer_1 = __importDefault(require("puppeteer"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const asyncPipeline = (0, util_1.promisify)(stream_1.pipeline);
exports.wallmartQueue = new bullmq_1.Queue('wallmart', {
    connection: RedisClient_1.default.duplicate(),
});
exports.reconQueue = new bullmq_1.Queue('recon', {
    connection: RedisClient_1.default.duplicate(),
});
exports.advertiserQueue = new bullmq_1.Queue('advertiser', {
    connection: RedisClient_1.default.duplicate(),
});
exports.wallmartWorker = new bullmq_1.Worker('wallmart', (job) => __awaiter(void 0, void 0, void 0, function* () {
    const wallmart = new WallmartOrderController_1.WallmartOrderController();
    wallmart.clientId = job.data.client_id;
    wallmart.clientSecret = job.data.client_secret;
    wallmart.schema_name = job.data.schema_name;
    wallmart.store_id = job.data.store_id;
    wallmart.user_setting_id = job.data.user_setting_id;
    if (job.name == 'download-item-report') {
        const filePath = path_1.default.join(__dirname, `../../dist/${job.data.store_id}/${job.data.user_id}/item-report`);
        if (!fs_1.default.existsSync(filePath)) {
            fs_1.default.mkdir(filePath, { recursive: true }, (err) => {
                return err;
            });
        }
        const response = yield axios_1.default.get(job.data.requestURL, {
            responseType: 'stream',
        });
        const fileName = `${filePath}/${job.data.schema_name}-${job.data.store_id}.zip`;
        // return {}
        const writeStream = (0, fs_1.createWriteStream)(fileName);
        yield asyncPipeline(response.data, writeStream);
        const zip = new adm_zip_1.default(fileName);
        const extractedFile = zip.getEntries();
        const newName = `${job.data.schema_name}-${job.data.store_id}.csv`;
        extractedFile[0].entryName = newName;
        // Below we extract the zip file
        zip.extractAllTo(filePath, true);
        fs_1.default.unlink(fileName, (err) => {
            logger_1.default.info(err);
        });
        const csvFileWithPath = `${filePath}/${newName}`;
        const awsService = new awsService_1.AwsService();
        const awsResult = yield awsService.uploadToS3(`${job.data.store_id}/${job.data.user_id}/item-report/${newName}`, csvFileWithPath);
        if (awsResult.result.$metadata.httpStatusCode === 200) {
            fs_1.default.unlink(csvFileWithPath, (err) => {
                logger_1.default.info(err);
            });
        }
        const awsFilePath = `${job.data.store_id}/${job.data.user_id}/item-report/${newName}`;
        const s3Response = yield awsService.readCSV(awsFilePath);
        const bodyContents = yield (0, utils_1.streamToString)(s3Response.Body);
        const csvDatas = yield bodyContents;
        const allResults = {
            csvData: [],
            schemaDetails: [],
        };
        allResults.csvData.push(csvDatas);
        allResults.schemaDetails.push({
            schema_name: job.data.schema_name,
            store_id: job.data.store_id,
        });
        for (let index = 0; index < allResults.schemaDetails.length; index++) {
            const schema_name = allResults.schemaDetails[index]['schema_name'];
            const store_id = allResults.schemaDetails[index]['store_id'];
            const fileData = allResults.csvData[index];
            const connection = new connection_1.DataSourceConnection();
            const productRepository = (yield connection.connection(schema_name)).getRepository(Index_1.Products);
            for (const data of fileData) {
                const checkProductExit = yield productRepository
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
                    item_id: data['Item ID'] === ''
                        ? 0
                        : parseFloat(data['Item ID']),
                    product_name: data['Product Name'],
                    lifecycle_status: data['Lifecycle Status'],
                    publish_status: data['Publish Status'],
                    status_change_reason: data['Status Change Reason'],
                    product_category: data['Product Category'],
                    price: data['Price'] === ''
                        ? 0
                        : parseFloat(data['Price']),
                    currency: data['Currency'],
                    buy_box_item_price: data['Buy Box Item Price'] === ''
                        ? 0
                        : parseFloat(data['Buy Box Item Price']),
                    buy_box_shipping_price: data['Buy Box Shipping Price'] === ''
                        ? 0
                        : parseFloat(data['Buy Box Shipping Price']),
                    msrp: data['MSRP'] === '' ? 0 : parseFloat(data['MSRP']),
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
                    reviews_count: data['Reviews Count'] === ''
                        ? 0
                        : parseFloat(data['Reviews Count']),
                    average_rating: data['Average Rating'] === ''
                        ? 0
                        : parseFloat(data['Average Rating']),
                    searchable: data['Searchable?'],
                    variant_group_id: data['Variant Group Id'],
                    primary_variant: data['Primary Variant?'],
                    variant_grouping_attributes: data['Variant Grouping Attributes'],
                    variant_grouping_values: data['Variant Grouping Values'],
                    competitor_url: data['Competitor URL'],
                    competitor_price: data['Competitor Price'] === ''
                        ? 0
                        : parseFloat(data['Competitor Price']),
                    competitor_ship_price: data['Competitor Ship Price'] === ''
                        ? 0
                        : parseFloat(data['Competitor Ship Price']),
                    competitor_last_date_fetched: data['Competitor Last Date Fetched'],
                    repricer_strategy: data['Repricer Strategy'],
                    minimum_seller_allowed_price: data['Minimum Seller Allowed Price'],
                    maximum_seller_allowed_price: data['Maximum Seller Allowed Price'],
                    repricer_status: data['Repricer Status'],
                    store_id: store_id,
                };
                // console.log("productData", productData);
                if (checkProductExit) {
                    productData['id'] = checkProductExit.id;
                }
                // console.log('productData', productData);
                // console.log('schema_name', schema_name);
                yield productRepository.save(productData);
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
            (yield connection.connection(schema_name)).destroy();
            // await productRepository.save(result, { chunk: 30 });
            // await productRepository.upsert(result,["sku","item_id","gtin","store_id"])
        }
    }
    if (job.name == 'getWFSOrder') {
        yield wallmart.getWFSWallMartOrders();
    }
    if (job.name == 'getSellerOrder') {
        yield wallmart.getSellerWallMartOrders();
    }
    if (job.name == 'getPLulfilledOrder') {
        yield wallmart.getPLFulfilledWallMartOrders();
    }
    return 'Success';
}), { connection: RedisClient_1.default });
exports.downloadAdvertiserReportWorker = new bullmq_1.Worker('advertiser', (job) => __awaiter(void 0, void 0, void 0, function* () {
    if (job.name == 'downloadItemPerformance') {
        logger_1.scrapperLogger.info('=========================== JOB STARTED========================');
        // const dirName = `./dist/${job.data.store_id}/${job.data.user_id}`;
        const dirName = path_1.default.join(__dirname, `../../dist/${job.data.store_id}/${job.data.user_id}`);
        let browser = null;
        try {
            logger_1.scrapperLogger.info('Advertiser Download downloadItemPerformance Queue start');
            if (!fs_1.default.existsSync(dirName)) {
                logger_1.scrapperLogger.info('Creating File');
                fs_1.default.mkdir(dirName, { recursive: true }, (err) => {
                    return err;
                });
            }
            logger_1.scrapperLogger.info('Created File');
            const getConfig = config_1.config.advertiserCredentials;
            if (config_1.config.env === 'DEV') {
                browser = yield puppeteer_1.default.launch({ headless: false });
            }
            else if (config_1.config.env === 'PRODUCTION') {
                browser = yield puppeteer_1.default.launch({
                    headless: 'new',
                    timeout: 0,
                    args: ['--no-sandbox'],
                });
            }
            const page = yield browser.newPage();
            yield page.setViewport({ width: 1366, height: 768 });
            yield page.goto('https://advertising.walmart.com/signin', {
                waitUntil: 'networkidle2',
            });
            const elements = yield page.$$('.panel-button');
            let i = 0;
            elements.forEach((element) => __awaiter(void 0, void 0, void 0, function* () {
                if (i == 1) {
                    yield element.click();
                }
                i = i + 1;
            }));
            yield page.waitForNavigation({ waitUntil: 'networkidle2' });
            const usernameInput = yield page.waitForSelector('input[type=text]');
            if (!usernameInput) {
                throw new Error('Username input not found');
            }
            yield usernameInput.type(getConfig.user_id);
            const passwordInput = yield page.waitForSelector('input[type=password]');
            if (!passwordInput) {
                throw new Error('Password input not found');
            }
            yield passwordInput.type(getConfig.password);
            const elements2 = yield page.$$('.app-btn');
            elements2.forEach((element) => __awaiter(void 0, void 0, void 0, function* () {
                yield element.click();
            }));
            yield page.waitForNavigation({ waitUntil: 'networkidle2' });
            logger_1.scrapperLogger.info('LOGIN DONE');
            logger_1.scrapperLogger.info('BEFORE DOWNLOAD ON SPECIFIC PATH');
            const client = yield page.target().createCDPSession();
            yield client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: dirName,
            });
            yield page.goto(job.data.csv_url);
        }
        catch (error) {
            logger_1.scrapperLogger.info('Catch blocked hit');
            logger_1.scrapperLogger.info('An error occurred:', error);
        }
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            if (browser != null) {
                logger_1.scrapperLogger.info('Browser is closing.');
                yield browser.close();
            }
            browser = null;
        }), 2000);
    }
    if (job.name === 'generateReport') {
        // console.log("advertiserData----->", job.data)
        const scrapperClass = new scrapperController_1.Scrapper();
        // const page = await scrapperClass.signIn();
        yield scrapperClass.requestReport(job.data.advertiserId, job.data.start_date, job.data.end_date, job.data.indexNumber, job.data.advertiserBatchId);
    }
    if (job.name === 'moveToAWS') {
        const moveToAWS = job.data;
        const connection = new connection_1.DataSourceConnection();
        const adReportRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserReports);
        try {
            const awsService = new awsService_1.AwsService();
            yield awsService.uploadToS3(moveToAWS.awsMovePath, moveToAWS.dirName);
            adReportRepository.update({ id: moveToAWS.advertiserid }, {
                s3_status: moveToAWS.s3_status,
            });
            logger_1.scrapperLogger.info(`AWS Path ${moveToAWS.awsMovePath}`);
            logger_1.scrapperLogger.info(`Local Directory Path ${moveToAWS.dirName}`);
            // fs.unlink(job.data.moveToAWSObj.dirName, (err) => {
            //     logger.info(err);
            // });
        }
        catch (error) {
            logger_1.scrapperLogger.info(`Move to AWS QUEUE Function Error Encounter ${error}`);
            logger_1.scrapperLogger.info(`AWS Error Encounter for advertise ID : ${moveToAWS.advertiserid}`);
        }
    }
    return { message: 'success' };
}), {
    connection: RedisClient_1.default,
    // maxStalledCount: 2,
    concurrency: 1,
    lockDuration: 120000,
});
exports.reconWorker = new bullmq_1.Worker('recon', (job) => __awaiter(void 0, void 0, void 0, function* () {
    const wallmartClient = new WallmartClients_1.WallmartClients();
    if (job.name == 'recon-available-date') {
        const connection = new connection_1.DataSourceConnection();
        const reconManageRepository = (yield connection.publicConnection()).getRepository(Index_1.ReconManagement);
        wallmartClient.clientId = job.data.clientId;
        wallmartClient.clientSecret = job.data.clientSecret;
        const getAvailableReconDate = yield wallmartClient.availableReconFiles();
        if (getAvailableReconDate &&
            getAvailableReconDate.availableApReportDates) {
            const availableReconData = [];
            for (const availableDate of getAvailableReconDate.availableApReportDates) {
                const reconManageData = {
                    available_date: availableDate,
                    user_setting_id: job.data.user_setting_id,
                };
                const checkDataExist = yield reconManageRepository.findOne({
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
            yield reconManageRepository.save(availableReconData);
        }
    }
    if (job.name == 'download-recon-file') {
        wallmartClient.clientId = job.data.client_id;
        wallmartClient.clientSecret = job.data.client_secret;
        const available_date = job.data.available_date;
        const file_id = job.data.file_id;
        const store_id = job.data.store_id;
        const user_id = job.data.user_id;
        yield wallmartClient.getReconReportCSV(available_date, store_id, user_id, file_id);
    }
    if (job.name == 'read-recon-file') {
        const connection = new connection_1.DataSourceConnection();
        const user_id = job.data.user_id;
        const filePath = job.data.file_path;
        const store_id = job.data.store_id;
        const file_id = job.data.file_id;
        const available_date = job.data.available_date;
        const reconRepository = (yield connection.connection(`default_${user_id}`)).getRepository(Index_1.Recon);
        const awsService = new awsService_1.AwsService();
        const s3Response = yield awsService.readCSV(filePath);
        const bodyContents = s3Response.Body;
        const readStream = bodyContents.pipe(unzipper_1.default.Parse());
        readStream.on('entry', (entry) => __awaiter(void 0, void 0, void 0, function* () {
            const bodyContents = yield (0, utils_1.streamToString)(entry);
            const csvDatas = yield bodyContents;
            const result = yield Promise.all(csvDatas.map((data) => {
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
                    transaction_posted_timestamp: !!data['Transaction Posted Timestamp']
                        ? (0, moment_1.default)(data['Transaction Posted Timestamp'], 'MM/DD/YYYY').format('YYYY-MM-DD')
                        : null,
                    transaction_type: data['Transaction Type'],
                    transaction_description: data['Transaction Description'],
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
                    transaction_reason_description: data['Transaction Reason Description'],
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
                    commission_incentive_program: data['Commission Incentive Program'],
                    commission_saving: data['Commission Saving']
                        ? parseFloat(data['Commission Saving'])
                        : 0,
                    customer_promo_type: data['Customer Promo Type'],
                    total_walmart_funded_savings_program: data['Total Walmart Funded Savings Program'],
                    campaign_id: data['Campaign Id'] === undefined
                        ? 0
                        : parseFloat(data['Campaign Id']),
                    store_id: store_id,
                };
            }));
            yield reconRepository.save(result, { chunk: 100 });
        }));
        const reconManageRepository = (yield connection.publicConnection()).getRepository(Index_1.ReconManagement);
        yield reconManageRepository.update({ id: file_id, available_date: available_date }, { is_file_read: true });
        (yield connection.publicConnection()).destroy();
    }
}), { connection: RedisClient_1.default });
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
exports.downloadAdvertiserReportWorker.on('completed', (job) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log(job.name);
    if (job.name === 'downloadItemPerformance') {
        logger_1.scrapperLogger.info('====================>', job.data);
        try {
            const connection = new connection_1.DataSourceConnection();
            const adReportRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserReports);
            const dirName = `dist/${job.data.store_id}/${job.data.user_id}`;
            const fileName = new URL(job.data.csv_url).searchParams.get('fileName');
            const updatedData = {
                downloaded_path: `${dirName}/${fileName}`,
                s3_status: 'Ready to move',
            };
            adReportRepository.update({ id: job.data.id }, updatedData);
        }
        catch (error) {
            logger_1.scrapperLogger.info('Aws Error : ', error);
        }
    }
    logger_1.scrapperLogger.info(`Job completed with result ${job.data}`);
}));
// wallmartWorker.run()
//# sourceMappingURL=queueService.js.map