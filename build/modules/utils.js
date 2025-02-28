"use strict";
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
exports.getPnlByItem = exports.getDateBatch = exports.findLatestDate = exports.streamToString = exports.dateRecursive = exports.fileUploadOptions = exports.s3Storage = exports.validateEmail = exports.removeSpcialCharacters = exports.getCurrentDateTime = exports.getCurrentTimestamp = exports.generateVerificationCode = exports.createTenantSchema = exports.randomNumber = exports.randomChar = exports.decryptData = exports.encryptData = void 0;
const config_1 = require("./../config");
const crypto_1 = __importDefault(require("crypto"));
const tenantScript_1 = __importDefault(require("../service/tenantScript"));
const connection_1 = require("../connection");
const multer_s3_1 = __importDefault(require("multer-s3"));
const moment_1 = __importDefault(require("moment"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const client_s3_1 = require("@aws-sdk/client-s3");
// Generate secret hash with crypto to use for encryption
const key = crypto_1.default
    .createHash('sha512')
    .update(config_1.config.hash.secret_key)
    .digest('hex')
    .substring(0, 32);
const encryptionIV = crypto_1.default
    .createHash('sha512')
    .update(config_1.config.hash.secret_iv)
    .digest('hex')
    .substring(0, 16);
// Encrypt data
function encryptData(data) {
    const cipher = crypto_1.default.createCipheriv(config_1.config.hash.ecnryption_method, key, encryptionIV);
    return Buffer.from(cipher.update(data, 'utf8', 'hex') + cipher.final('hex')).toString('base64'); // Encrypts data and converts to hex and base64
}
exports.encryptData = encryptData;
// Decrypt data
function decryptData(encryptedData) {
    const buff = Buffer.from(encryptedData, 'base64');
    const decipher = crypto_1.default.createDecipheriv(config_1.config.hash.ecnryption_method, key, encryptionIV);
    return (decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
        decipher.final('utf8')); // Decrypts data and converts to utf8
}
exports.decryptData = decryptData;
function randomChar() {
    return (Math.random() + 1).toString(36).substring(2);
}
exports.randomChar = randomChar;
function randomNumber() {
    return Math.floor(100000 + Math.random() * 900000);
}
exports.randomNumber = randomNumber;
function createTenantSchema(schemaName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!schemaName)
            return 'Schema name required';
        const schemaNameReplaced = removeSpcialCharacters(schemaName);
        const ddl = new tenantScript_1.default(schemaNameReplaced);
        const dataSourceObj = new connection_1.DataSourceConnection();
        const schemaCreated = yield (yield dataSourceObj.publicConnection()).query(ddl.create_schema());
        const tenantShema = yield dataSourceObj.connection(schemaCreated);
        const onlyFunc = Object.getOwnPropertyNames(ddl).filter((x) => x != 'schema' && x != 'create_schema');
        yield Promise.all(onlyFunc.map((v) => __awaiter(this, void 0, void 0, function* () {
            yield tenantShema.query(ddl[v]());
        })));
    });
}
exports.createTenantSchema = createTenantSchema;
function generateVerificationCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = length || 6;
    let code = '';
    for (let i = 0; i < codeLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code;
}
exports.generateVerificationCode = generateVerificationCode;
function getCurrentTimestamp() {
    return Date.now();
}
exports.getCurrentTimestamp = getCurrentTimestamp;
function getCurrentDateTime() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return currentDateTime;
}
exports.getCurrentDateTime = getCurrentDateTime;
function removeSpcialCharacters(str) {
    if (str) {
        return str.replace(/[&\\ @#,+()$~%.'":*?<>{}]/g, '_');
    }
    else {
        return null;
    }
}
exports.removeSpcialCharacters = removeSpcialCharacters;
function validateEmail(email) {
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    else {
        return false;
    }
}
exports.validateEmail = validateEmail;
exports.s3Storage = (0, multer_s3_1.default)({
    s3: new client_s3_1.S3Client({
        credentials: {
            accessKeyId: config_1.config.aws.accessKey,
            secretAccessKey: config_1.config.aws.secretKey,
        },
        region: config_1.config.aws.region, // this is the region that you select in AWS account
    }),
    bucket: config_1.config.aws.bucket,
    // acl: "public-read", // storage access type
    metadata: (req, file, cb) => {
        cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
        const fileName = `profile/${Date.now()}_${file.fieldname}_${file.originalname}`;
        cb(null, fileName);
    },
});
exports.fileUploadOptions = {
    storage: exports.s3Storage,
    // storage: multer.diskStorage({
    //     destination(req, file, callback) {
    //         callback(null, './uploads/profile/');
    //     },
    //     filename: (req: any, file: any, cb: any) => {
    //         const fileExtension = '.' + file.originalname.split('.').pop();
    //         const fileName = Date.now() + fileExtension;
    //         cb(null, fileName);
    //     },
    // }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpg' ||
            file.mimetype === 'image/jpeg' ||
            file.mimetype === 'image/png' ||
            file.mimetype === 'image/gif') {
            cb(null, true);
        }
        else {
            cb(new Error('Image uploaded is not of type jpg/jpeg, png OR gif'), false);
        }
    },
    limits: {
        fieldNameSize: 255,
        fileSize: 1 * 1024 * 1024, // 2MB limit
    },
};
const dateRecursive = (snyc_date) => {
    let startDate;
    if (snyc_date === null) {
        startDate = (0, moment_1.default)().subtract(1, 'year');
    }
    else {
        // startDate = moment(snyc_date, "YYYY-MM-DD").add(1, 'day')//.subtract(1, 'day');//.add(1, 'day');
        startDate = (0, moment_1.default)(snyc_date, 'MM/DD/YYYY').add(1, 'day');
    }
    // return startDate;
    const finalDateArray = [];
    const check = true;
    while (check) {
        const endDate = startDate.clone().add(29, 'days');
        const startDateFormatted = startDate.format('MM/DD/YYYY');
        const endDateFormatted = endDate.format('MM/DD/YYYY');
        if (endDate.isSameOrAfter((0, moment_1.default)())) {
            finalDateArray.push({
                startDate: startDateFormatted,
                endDate: (0, moment_1.default)().subtract(2, 'days').format('MM/DD/YYYY'),
            });
            break;
        }
        finalDateArray.push({
            startDate: startDateFormatted,
            endDate: endDateFormatted,
        });
        startDate.add(30, 'days');
    }
    return finalDateArray;
};
exports.dateRecursive = dateRecursive;
const streamToString = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.pipe((0, csv_parser_1.default)()).on('data', (row) => {
        if (row['Period Start Date']) {
            if (!row['Period Start Date'].includes('Number of Lines in file')) {
                chunks.push(row);
            }
        }
        else {
            chunks.push(row);
        }
    });
    stream.on('error', reject);
    // stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on('end', () => resolve(chunks));
});
exports.streamToString = streamToString;
const findLatestDate = (dateArray) => {
    const parseDate = (dateStr) => {
        const momentDate = (0, moment_1.default)(dateStr, 'MM-DD-YYYY'); // Corrected the date format here
        return momentDate.isValid() ? momentDate.toDate() : null;
    };
    // Convert dates to JavaScript Date objects
    const dateObjects = dateArray
        .map((item) => parseDate(item.available_date))
        .filter((date) => date !== null);
    // Find the biggest date
    const biggestDate = dateObjects.reduce((maxDate, currentDate) => {
        return currentDate.getTime() > maxDate.getTime()
            ? currentDate
            : maxDate;
    });
    // console.log(moment(biggestDate).format('MMDDYYYY'));
    return (0, moment_1.default)(biggestDate).format('MM-DD-YYYY');
};
exports.findLatestDate = findLatestDate;
const getDateBatch = (snyc_date) => {
    let startDate;
    if (snyc_date === null) {
        startDate = (0, moment_1.default)().subtract(1, 'year');
    }
    else {
        // startDate = moment(snyc_date, "YYYY-MM-DD").add(1, 'day')//.subtract(1, 'day');//.add(1, 'day');
        // startDate = moment(snyc_date, 'MM/DD/YYYY').add(1, 'day');
        startDate = (0, moment_1.default)(snyc_date, 'MM/DD/YYYY');
    }
    // return startDate;
    const finalDateArray = [];
    const check = true;
    while (check) {
        const endDate = startDate.clone().add(59, 'days');
        // const endDate = startDate.clone().add(30, 'days');
        const startDateFormatted = startDate.format('MM/DD/YYYY');
        const endDateFormatted = endDate.format('MM/DD/YYYY');
        if (endDate.isSameOrAfter((0, moment_1.default)())) {
            finalDateArray.push({
                startDate: startDateFormatted,
                endDate: (0, moment_1.default)().subtract(2, 'days').format('MM/DD/YYYY'),
                // endDate: moment().format('MM/DD/YYYY'),
            });
            break;
        }
        finalDateArray.push({
            startDate: startDateFormatted,
            endDate: endDateFormatted,
        });
        startDate.add(60, 'days');
    }
    return finalDateArray;
};
exports.getDateBatch = getDateBatch;
const getPnlByItem = (productRepository, startDate, endDate, id, filter = null) => __awaiter(void 0, void 0, void 0, function* () {
    const queryBuilder = yield productRepository
        .createQueryBuilder('p')
        .select('p.id', 'id')
        .addSelect('p.sku', 'sku')
        .addSelect('p.item_id', 'item_id')
        .addSelect('p.primary_image_url', 'image')
        .addSelect('p.product_name', 'product_name')
        .addSelect('p.item_page_url', 'product_url')
        .addSelect('CAST(p.price AS FLOAT)', 'product_price')
        .addSelect('coalesce(SUM(oc.total_amount_sale),0)', 'total_amount_sale')
        .addSelect('coalesce(oc.order_line_number,0)', 'units_sold')
        .addSelect('CAST(COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(SUM(oc.total_amount_sale) / coalesce(oc.order_line_number,0) AS DECIMAL(10, 2)) ELSE 0 END, 0) AS FLOAT)', 'average_price')
        /**
         * Get Advertiser Data Query Start Here
         */
        .addSelect('COALESCE(adv.adv_count,0)', 'adv_count')
        .addSelect('COALESCE(adv.ad_spend,0)', 'ad_spend')
        .addSelect('COALESCE(adv.ad_sales,0)', 'ad_sales')
        .addSelect('COALESCE(adv.ad_units,0)', 'ad_units')
        .addSelect('COALESCE(adv.impressions,0)', 'impressions')
        .addSelect('COALESCE(adv.total_clicks,0)', 'total_clicks')
        .addSelect('COALESCE(adv.orders,0)', 'adv_orders')
        /**
         * Get Advertiser Data Query End Here
         */
        .addSelect('p.gtin', 'gtin')
        /**
         * Get Cap Fees Data Start Here
         */
        // .addSelect('cap.cap_amount', 'cap_total')
        /**
         * Get Cap Fees Data End Here
         */
        /**
         * Arthematic Calculation Query Start Below
         */
        .addSelect('CAST(coalesce(SUM(oc.total_amount_sale) - adv.ad_sales,0) AS FLOAT)', 'organic_sales')
        // .addSelect(
        //     'CAST(CASE WHEN coalesce(SUM(oc.total_amount_sale),0) > 0 THEN (coalesce(oc.total_amount_sale,0)- coalesce(adv.ad_sales,0))  / coalesce(SUM(oc.total_amount_sale),0) ELSE 0 END AS FLOAT)',
        //     // 'CAST((coalesce(SUM(oc.total_amount_sale),0) - coalesce(adv.ad_sales,0)) / coalesce(SUM(oc.total_amount_sale),0) AS FLOAT)',
        //     'organic_sales_percentage',
        // )
        .addSelect(`
                CASE
                WHEN coalesce(SUM(oc.total_amount_sale), 0) = 0 THEN 0
                ELSE (coalesce(SUM(oc.total_amount_sale), 0) - coalesce(adv.ad_sales, 0)) / coalesce(SUM(oc.total_amount_sale), 0)
                END
                AS organic_sales_percentage
            `)
        .addSelect('CAST(CASE WHEN adv.ad_spend > 0 THEN CAST(adv.ad_sales / adv.ad_spend AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'roas')
        .addSelect('CAST(CASE WHEN adv.ad_spend > 0 THEN CAST(coalesce(SUM(oc.total_amount_sale),0) / coalesce(adv.ad_spend,0)  AS DECIMAL(10, 2)) ELSE 0 END AS FLOAT)', 'troas')
        // .addSelect(
        //     'CAST(CASE WHEN adv.ad_sales > 0 THEN CAST(adv.ad_spend / adv.ad_sales AS FLOAT) * 100 ELSE 0 END)',
        //     'acos',
        // )
        .addSelect('CASE WHEN adv.ad_sales > 0 THEN CAST((adv.ad_spend / adv.ad_sales) AS FLOAT) ELSE 0 END', 'acos')
        // .addSelect(
        //     'CAST(COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(adv.ad_spend / SUM(oc.total_amount_sale) AS DECIMAL(10, 2)) ELSE 0  END, 0) AS FLOAT)',
        //     'tacos',
        // )
        .addSelect('COALESCE(CASE WHEN SUM(oc.total_amount_sale) > 0 THEN CAST(adv.ad_spend / SUM(oc.total_amount_sale) AS FLOAT) ELSE 0 END)', 'tacos')
        .addSelect('CAST(coalesce(adv.total_clicks,0) AS FLOAT)', 'total_clicks')
        // .addSelect(
        //     'CAST(CASE WHEN adv.impressions > 0 THEN CAST(adv.total_clicks / adv.impressions  AS FLOAT) ELSE 0 END)',
        //     'ctr',
        // )
        .addSelect('CASE WHEN adv.impressions > 0 THEN CAST(CAST(adv.total_clicks AS FLOAT) / adv.impressions AS FLOAT) ELSE 0 END', 'ctr')
        // .addSelect(
        //     'CAST WHEN adv.total_clicks > 0 THEN CAST(adv.ad_orders / adv.total_clicks AS FLOAT) ELSE 0 END',
        //     'cvr_oder',
        // )
        .addSelect('CASE WHEN adv.total_clicks > 0 THEN CAST(adv.ad_orders AS FLOAT) / adv.total_clicks ELSE 0 END', 'cvr_oder')
        // .addSelect(
        //     'CAST WHEN adv.total_clicks > 0 THEN CAST(coalesce(adv.ad_units,0) / coalesce(adv.total_clicks,0)  AS FLOAT) ELSE 0 END)',
        //     'cvr_unit',
        // )
        .addSelect('CASE WHEN adv.total_clicks > 0 THEN CAST(COALESCE(adv.ad_units, 0) AS FLOAT) / CAST(COALESCE(adv.total_clicks, 0) AS FLOAT) ELSE 0 END', 'cvr_unit')
        .addSelect('CAST(coalesce(wfs.wfs_amount,0) AS FLOAT)', 'total_wfs_amount')
        .addSelect('CAST(coalesce(dispute.dispute_amount,0) AS FLOAT)', 'total_dispute_amount')
        .addSelect('CAST(coalesce(commission.commission_amount,0) AS FLOAT)', 'total_commission_amount')
        .addSelect('CAST(coalesce(returnfees.return_amount,0) AS FLOAT)', 'total_return_amount')
        .addSelect('CAST(coalesce(shipping_fees.shipping_fees,0) AS FLOAT)', 'shipping_total')
        .addSelect('CAST(coalesce(cap.cap_amount,0) AS FLOAT)', 'cap_total')
        .addSelect('CAST(coalesce(sum(c.amount),0) AS FLOAT)', 'cogs_total')
        .addSelect('coalesce(return_unit.return_unit,0)', 'return_unit')
        /**
         * Arthematic Calculation Query End Below
         */
        .leftJoin('cogs', 'c', 'c.product_id = p.id')
        .leftJoin((subQuery) => {
        return subQuery
            .select('och.sku', 'sku')
            .addSelect('CAST(COALESCE(SUM(och.product_amount), 0) AS FLOAT)', 'total_amount_sale')
            .addSelect('CAST(COALESCE(count(och.order_line_number), 0) AS FLOAT)', 'order_line_number')
            .from('orders', 'o')
            .leftJoin('order_charges', 'och', 'och.order_id=o.id')
            .where('och.charge_type = :charge_type', {
            charge_type: 'PRODUCT',
        })
            .andWhere('och.order_status != :order_status', {
            order_status: 'Cancelled',
        })
            .andWhere('o.formated_date BETWEEN :o_startDate AND :o_endDate', {
            o_startDate: startDate.format('YYYY-MM-DD'),
            o_endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('och.sku');
    }, 'oc', 'oc.sku = p.sku')
        .leftJoin((subQuery) => {
        return subQuery
            .select('adv_product.item_id', 'product_item_id')
            .addSelect('a.item_id', 'adv_item_id')
            .addSelect('CAST(coalesce(COUNT(a.item_id),0) AS FLOAT)', 'adv_count')
            .addSelect('CAST(coalesce(SUM(a.ad_spend),0) AS FLOAT)', 'ad_spend')
            .addSelect('CAST(coalesce(SUM(a.total_attributed_sales),0) AS FLOAT)', 'ad_sales')
            .addSelect('CAST(coalesce(SUM(a.units_sold),0) AS FLOAT)', 'ad_units')
            .addSelect('CAST(coalesce(SUM(a.orders),0) AS FLOAT)', 'ad_orders')
            .addSelect('CAST(coalesce(SUM(a.impressions),0) AS FLOAT)', 'impressions')
            .addSelect('CAST(coalesce(SUM(a.clicks),0) AS FLOAT)', 'total_clicks')
            .addSelect('CAST(coalesce(SUM(a.orders),0) AS FLOAT)', 'orders')
            .from('products', 'adv_product')
            .innerJoin('advertisers', 'a', 'a.item_id = adv_product.item_id')
            .where('a.store_id IN (:...storeId)', {
            storeId: id,
        })
            .andWhere('a.date BETWEEN :startDate AND :endDate', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('adv_product.item_id,a.item_id');
    }, 'adv', 'adv.adv_item_id = p.item_id')
        .leftJoin((subQuery) => {
        return subQuery
            .select('rs_product.gtin', 'gtin')
            .addSelect('rs.partner_gtin', 'partner_gtin')
            .addSelect('CAST(coalesce(SUM(rs.amount),0) AS FLOAT)', 'shipping_fees')
            .from('products', 'rs_product') // Use 'rs_product' as the alias
            .leftJoin('recon', 'rs', 'rs.partner_gtin = rs_product.gtin')
            .where('rs.store_id IN (:...storeId)', {
            storeId: id,
        })
            .andWhere('rs.transaction_type = :shipping_transactionType', {
            shipping_transactionType: 'Adjustment',
        })
            .andWhere('rs.transaction_description = :shipping_transactionDescriptions', {
            shipping_transactionDescriptions: 'Walmart Shipping Label Service Charge',
        })
            .andWhere('rs.amount_type = :shipping_amountType', {
            shipping_amountType: 'Fee/Reimbursement',
        })
            .andWhere('rs.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('rs_product.gtin,rs.partner_gtin');
    }, 'shipping_fees', 'shipping_fees.partner_gtin = p.gtin')
        .leftJoin((subQuery) => {
        return subQuery
            .select('rcap_product.gtin', 'gtin')
            .addSelect('rcap.partner_gtin', 'partner_gtin')
            .addSelect('CAST(coalesce(SUM(rcap.amount),0) AS FLOAT)', 'cap_amount')
            .from('products', 'rcap_product') // Use 'rcap_product' as the alias
            .leftJoin('recon', 'rcap', 'rcap.partner_gtin = rcap_product.gtin')
            .where('rcap.store_id IN (:...cap_storeId)', {
            cap_storeId: id,
        })
            .andWhere('rcap.amount_type = :cap_shipping_amountType', {
            cap_shipping_amountType: 'Total Walmart Funded Savings',
        })
            .andWhere('rcap.transaction_posted_timestamp BETWEEN :cap_startDate AND :cap_endDate', {
            cap_startDate: startDate.format('YYYY-MM-DD'),
            cap_endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('rcap_product.gtin,rcap.partner_gtin');
    }, 'cap', 'cap.partner_gtin = p.gtin')
        .leftJoin((subQuery) => {
        return subQuery
            .select('rc_product.gtin', 'gtin')
            .addSelect('rc.partner_gtin', 'partner_gtin')
            .addSelect('CAST(coalesce(SUM(rc.amount),0) AS FLOAT)', 'commission_amount')
            .from('products', 'rc_product') // Use 'rc_product' as the alias
            .leftJoin('recon', 'rc', 'rc.partner_gtin = rc_product.gtin')
            .where('rc.store_id IN (:...commission_storeId)', {
            commission_storeId: id,
        })
            .andWhere('rc.amount_type = :commission_shipping_amountType', {
            commission_shipping_amountType: 'Commission on Product',
        })
            .andWhere('rc.transaction_posted_timestamp BETWEEN :commission_startDate AND :commission_endDate', {
            commission_startDate: startDate.format('YYYY-MM-DD'),
            commission_endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('rc_product.gtin,rc.partner_gtin');
    }, 'commission', 'commission.partner_gtin = p.gtin')
        .leftJoin((subQuery) => {
        return subQuery
            .select('rdis_product.gtin', 'gtin')
            .addSelect('rdis.partner_gtin', 'partner_gtin')
            .addSelect('CAST(coalesce(SUM(rdis.amount),0) AS FLOAT)', 'dispute_amount')
            .from('products', 'rdis_product') // Use 'rdis_product' as the alias
            .leftJoin('recon', 'rdis', 'rdis.partner_gtin = rdis_product.gtin')
            .where('rdis.store_id IN (:...storeId)', {
            storeId: id,
        })
            .andWhere('rdis.transaction_type IN (:...dispute_transactionTypes)', {
            dispute_transactionTypes: [
                'Adjustment',
                'Dispute Settlement',
            ],
        })
            .andWhere('rdis.transaction_description IN (:...dispute_transactionDescriptions)', {
            dispute_transactionDescriptions: [
                'Walmart Return Shipping Charge Reversal',
                'Walmart Customer Care Refund Reversal',
            ],
        })
            .andWhere('rdis.amount_type = :dispute_amountType', {
            dispute_amountType: 'Fee/Reimbursement',
        })
            .andWhere('rdis.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('rdis_product.gtin,rdis.partner_gtin');
    }, 'dispute', 'dispute.partner_gtin = p.gtin')
        .leftJoin((subQuery) => {
        return subQuery
            .select('rr_product.gtin', 'gtin')
            .addSelect('rr.partner_gtin', 'partner_gtin')
            .addSelect('CAST(coalesce(SUM(rr.amount),0) AS FLOAT)', 'return_amount')
            .from('products', 'rr_product') // Use 'rr_product' as the alias
            .leftJoin('recon', 'rr', 'rr.partner_gtin = rr_product.gtin')
            .where('rr.store_id IN (:...storeId)', {
            storeId: id,
        })
            .andWhere('rr.transaction_type IN (:...returnTransactionTypes)', {
            returnTransactionTypes: ['Refund'],
        })
            .andWhere('rr.transaction_description IN (:...returnTransactionDescriptions)', {
            returnTransactionDescriptions: [
                'Return Refund',
                'Keep-it refund',
            ],
        })
            .andWhere('rr.amount_type IN (:...returnAmountTypes)', {
            returnAmountTypes: ['Product Price'],
        })
            .andWhere('rr.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('rr_product.gtin,rr.partner_gtin');
    }, 'returnfees', 'returnfees.partner_gtin = p.gtin')
        .leftJoin((subQuery) => {
        return subQuery
            .select('rwfs_product.gtin', 'gtin')
            .addSelect('wfs.partner_gtin', 'partner_gtin')
            .addSelect('CAST(coalesce(SUM(wfs.amount),0) AS FLOAT)', 'wfs_amount')
            .from('products', 'rwfs_product') // Use 'rwfs_product' as the alias
            .leftJoin('recon', 'wfs', 'wfs.partner_gtin = rwfs_product.gtin')
            .where('wfs.store_id IN (:...storeId)', {
            storeId: id,
        })
            .andWhere('wfs.transaction_type IN (:...transactionTypes)', {
            transactionTypes: ['Adjustment', 'Service Fee'],
        })
            .andWhere('wfs.transaction_description IN (:...transactionDescriptions)', {
            transactionDescriptions: [
                'WFS Fulfillment fee',
                '"WFS Return Shipping fee "',
                'Walmart Return Shipping Charge',
            ],
        })
            .andWhere('wfs.amount_type IN (:...amountTypes)', {
            amountTypes: ['Fee/Reimbursement', 'Item Fees'],
        })
            .andWhere('wfs.transaction_posted_timestamp BETWEEN :startDate AND :endDate', {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('rwfs_product.gtin,wfs.partner_gtin');
    }, 'wfs', 'wfs.partner_gtin = p.gtin')
        .leftJoin((subQuery) => {
        return subQuery
            .select('ru_product.gtin', 'gtin')
            .addSelect('ru.partner_gtin', 'partner_gtin')
            .addSelect('CAST(COUNT(ru.id) AS FLOAT)', 'return_unit')
            .from('products', 'ru_product') // Use 'ru_product' as the alias
            .leftJoin('recon', 'ru', 'ru.partner_gtin = ru_product.gtin')
            .where('ru.store_id IN (:...storeId)', {
            storeId: id,
        })
            .andWhere('ru.transaction_type IN (:...ru_transactionTypes)', {
            ru_transactionTypes: ['Refund'],
        })
            .andWhere('ru.amount_type IN (:...ru_amountTypes)', {
            ru_amountTypes: ['Product Price'],
        })
            .andWhere('ru.transaction_posted_timestamp BETWEEN :ru_startDate AND :ru_endDate', {
            ru_startDate: startDate.format('YYYY-MM-DD'),
            ru_endDate: endDate.format('YYYY-MM-DD'),
        })
            .groupBy('ru_product.gtin,ru.partner_gtin');
    }, 'return_unit', 'return_unit.partner_gtin = p.gtin')
        .where('p.store_id IN (:...storeId)', {
        storeId: id,
    });
    if (filter !== null && filter.action === 'sort') {
        queryBuilder.orderBy(filter.name, filter.direction.toUpperCase());
    }
    // .groupBy(
    //     `p.sku,
    //     p.id,
    //     p.item_id,
    //     p.product_name,
    //     p.gtin,
    //     p.item_page_url,
    //     p.primary_image_url,
    //     p.price,
    //     oc.total_amount_sale,
    //     oc.order_line_number
    //     `,
    // )
    const data = yield queryBuilder
        .groupBy(`p.sku,
                p.id,
                p.item_id,
                p.product_name,
                p.gtin,
                p.item_page_url,
                p.primary_image_url,
                p.price,
                oc.total_amount_sale,
                adv.adv_count,
                adv.ad_spend,
                adv.ad_sales,
                adv.ad_units,
                adv.ad_orders,
                adv.impressions,
                adv.total_clicks,
                adv.orders,
                oc.order_line_number,
                shipping_fees.shipping_fees,
                cap.cap_amount,
                wfs.wfs_amount,
                commission.commission_amount,
                returnfees.return_amount,
                dispute.dispute_amount,
                return_unit.return_unit
                `)
        // .orderBy('p.id')
        .getRawMany();
    return data;
});
exports.getPnlByItem = getPnlByItem;
//# sourceMappingURL=utils.js.map