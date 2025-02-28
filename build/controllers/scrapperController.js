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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
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
exports.Scrapper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const routing_controllers_1 = require("routing-controllers");
const connection_1 = require("../connection");
// import csv from 'csv-parser';
const moment_1 = __importDefault(require("moment"));
const config_1 = require("../config");
const Index_1 = require("../entity/Index");
const fs_1 = __importDefault(require("fs"));
// import { pipeline } from 'stream';
// import { promisify } from 'util';
const adm_zip_1 = __importDefault(require("adm-zip"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importStar(require("../service/logger"));
const queueService_1 = require("../service/queueService");
const utils_1 = require("./../modules/utils");
const awsService_1 = require("../service/awsService");
// const fs = require('fs');
// import fs from "fs"
// const asyncPipeline = promisify(pipeline);
let Scrapper = class Scrapper extends connection_1.DataSourceConnection {
    constructor() {
        super(...arguments);
        this.isLoggedIn = false;
        this.reportType = 'Item Performance';
        this.indexNumber = 3;
    }
    signIn() {
        return __awaiter(this, void 0, void 0, function* () {
            const getConfig = config_1.config.advertiserCredentials;
            let browser;
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
            elements.forEach((element) => __awaiter(this, void 0, void 0, function* () {
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
            elements2.forEach((element) => __awaiter(this, void 0, void 0, function* () {
                yield element.click();
            }));
            yield page.waitForNavigation({ waitUntil: 'networkidle2' });
            this.isLoggedIn = true;
            return { page: page, browser: browser };
        });
    }
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = new connection_1.DataSourceConnection();
            const advertiserReportBatchRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserReportBatch);
            // console.log(dateRecursive("08/31/2023"));
            // const jobDataForDownload = 'ajskhdkjhajkshdkhaskd'
            // await advertiserQueue.add("index", jobDataForDownload);
            // return {};
            // let page;
            // let browser;
            // if (!this.isLoggedIn) {
            // 	try {
            // 		const openingPage = await this.signIn();
            // 		page = openingPage.page;
            // 		browser = openingPage.browser;
            // 	} catch (error) {
            // 		scrapperLogger.info("Login Failed")
            // 		return { error: "Login failed" };
            // 	}
            // }
            const getStoreConfigs = yield this.getUserConfig();
            // scrapperLogger.info(getStoreConfigs)
            for (let index = 0; index < getStoreConfigs.length; index++) {
                const sync_date = getStoreConfigs[index].sync_date; // Get the sync date from the user settings table
                const getDate = (0, utils_1.dateRecursive)(sync_date); // YYYY-MM-DD This will call Recursive function
                const advertiserId = getStoreConfigs[index].advertiser_id;
                // await page.goto(
                // 	`https://advertising.walmart.com/view/report/advertiser/${advertiserId}/ondemand`,
                // 	{ waitUntil: "networkidle2" }
                // );
                for (let dateIndex = 0; dateIndex < getDate.length; dateIndex++) {
                    // Recursive function loop
                    const start_date = getDate[dateIndex].startDate;
                    const end_date = getDate[dateIndex].endDate;
                    const advertiser_report_batchOBJ = {
                        advertiser_id: advertiserId,
                        advertiser_management_id: getStoreConfigs[index].advertiserId,
                        start_date: start_date,
                        end_date: end_date,
                    };
                    const getAdvertiserReportBatchId = yield advertiserReportBatchRepository.save(advertiser_report_batchOBJ);
                    const advertiserData = {
                        start_date: start_date,
                        end_date: end_date,
                        advertiserId: advertiserId,
                        ad_id: getStoreConfigs[index].advertiserId,
                        indexNumber: this.indexNumber,
                        advertiserBatchId: getAdvertiserReportBatchId.id,
                    };
                    yield queueService_1.advertiserQueue.add('generateReport', advertiserData);
                    logger_1.scrapperLogger.info(`advertiserId : ${advertiserId} -> start_date : ${start_date} - end_date : ${end_date}`);
                    // await this.requestReport(page, advertiserId, start_date, end_date);
                    if (this.indexNumber === 3) {
                        const advertiserManagementRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserManagement);
                        yield advertiserManagementRepository.update({ id: getStoreConfigs[index].advertiserId }, { sync_date: end_date });
                    }
                    // Below Line will update the sync_date by end date this will be get from dateRecursive function
                }
            }
            this.isLoggedIn = false;
            // await browser.close();
            return {};
            // console.log(getStoreConfigs);
            // const adversiterIDArray = [];
            // for (let checkAdvertiserIndex = 0; checkAdvertiserIndex < getStoreConfigs.length; checkAdvertiserIndex++) {
            //     const config = getStoreConfigs[checkAdvertiserIndex];
            //     adversiterIDArray.push(config)
            // }
            // const finalAdvertiserArray = await this.checkGenerateReportUrl(page, adversiterIDArray)
            // Below 2 lines will connect table user_settings
            // Below loop will pass advertiser_id, sync_date, start_date and end_date
            // for (let index = 0; index < finalAdvertiserArray.length; index++) {
            //     const sync_date = finalAdvertiserArray[index].sync_date // Get the sync date from the user settings table
            //     const getDate = this.dateRecursive(sync_date) // YYYY-MM-DD This will call Recursive function
            //     const advertiserId = finalAdvertiserArray[index].advertiser_id // This will get the advertiserId
            //     // const userSettingID = finalAdvertiserArray[index].userSettingID // This Will get the user_setting ID
            //     for (let dateIndex = 0; dateIndex < getDate.length; dateIndex++) { // Recursive function loop
            //         const start_date = getDate[dateIndex].startDate;
            //         const end_date = getDate[dateIndex].endDate;
            //         await this.requestReport(page, advertiserId, start_date, end_date)
            //         if (this.indexNumber === 3) {
            //             const advertiserManagementRepository = (await this.publicConnection()).getRepository(AdvertiserManagement);
            //             await advertiserManagementRepository.update({ id: finalAdvertiserArray[index].advertiserId }, { sync_date: getDate[dateIndex].endDate })
            //         }
            //         // Below Line will update the sync_date by end date this will be get from dateRecursive function
            //     }
            // }
            // this.isLoggedIn = false
            // await browser.close()
            // return {}
        });
    }
    checkGenerateReportUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            let page;
            let browser;
            if (!this.isLoggedIn) {
                try {
                    const openingPage = yield this.signIn();
                    page = openingPage.page;
                    browser = openingPage.browser;
                }
                catch (error) {
                    logger_1.scrapperLogger.info('🚀 ~ file: scrapperController.ts:193 ~ Scrapper ~ checkGenerateReportUrl ~ error:', error);
                    return { error: 'Login failed' };
                }
            }
            const connection = new connection_1.DataSourceConnection();
            const advertiserManagementRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserManagement);
            const getAdvertiser = yield advertiserManagementRepository
                .createQueryBuilder('advertiserManagement')
                .select('advertiserManagement.advertiser_id', 'advertiser_id')
                .addSelect('advertiserManagement.id', 'id')
                .where('advertiserManagement.is_verify = :is_verify', {
                is_verify: false,
            })
                .andWhere('advertiserManagement.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .getRawMany();
            for (let index = 0; index < getAdvertiser.length; index++) {
                yield page.goto(`https://advertising.walmart.com/view/report/advertiser/${getAdvertiser[index].advertiser_id}/ondemand`, { waitUntil: 'networkidle2' });
                yield this.delay(3000);
                const pageContent = yield page.content();
                if (!pageContent.includes('This page does not exist')) {
                    logger_1.default.info(getAdvertiser[index].id);
                    logger_1.default.info('========================================');
                    yield advertiserManagementRepository.update({ id: getAdvertiser[index].id }, { is_verify: true });
                }
            }
            this.isLoggedIn = false;
            yield browser.close();
            return {};
            // for (let index = 0; index < adversiterIDArray.length; index++) {
            //     const advertiserId = adversiterIDArray[index].advertiser_id
            //     const pageContent = await page.content();
            //     if (pageContent.includes('This page does not exist')) {
            //         console.log("fail ",adversiterIDArray);
            //         // adversiterIDArray.splice(index, 1);
            //         // index--;
            //         // adversiterIDArray = adversiterIDArray.filter((config) => config.advertiser_id !== advertiserId);
            //     }
            // }
            // return adversiterIDArray;
        });
    }
    requestReport(advertiserId, start_date, end_date, indexNumber, advertiserBatchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = new connection_1.DataSourceConnection();
            const advertiserReportBatchRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserReportBatch);
            const signINpage = yield this.signIn();
            const page = signINpage.page;
            logger_1.scrapperLogger.info('URL IS OPENING');
            yield page.goto(`https://advertising.walmart.com/view/report/advertiser/${advertiserId}/ondemand`, { waitUntil: 'networkidle0' });
            logger_1.scrapperLogger.info('URL IS LOADED');
            const buttonSelector = 'button[data-automation-id="button-open-request-modal"]';
            yield page.waitForSelector(buttonSelector);
            const button = yield page.$(buttonSelector);
            yield button.click();
            logger_1.scrapperLogger.info(`Request report button clicked`);
            // await this.generateReport(page, start_date, end_date, advertiserId);
            // }
            // async generateReport(page, start_date, end_date, advertiserId) {
            try {
                logger_1.scrapperLogger.info('Enter in generateReport function ');
                const reportTypeDropdown = '.select-wmlt';
                yield page.waitForSelector(reportTypeDropdown, { timeout: 30000 });
                const reportTypeElement = yield page.$$(reportTypeDropdown);
                //get options for 1 select report type
                reportTypeElement[0].click();
                const reportTypeoptionSelector = '.select-wmlt__menu-list';
                yield page.waitForSelector(reportTypeoptionSelector);
                const getMenu = yield page.$$('.select-wmlt__option');
                yield getMenu[indexNumber].click();
                // console.log('this.indexNumber', indexNumber);
                if (indexNumber === 3) {
                    //Start for attribution window
                    yield page.waitForSelector(reportTypeDropdown, {
                        timeout: 30000,
                    });
                    const attrTypeElement = yield page.$$(reportTypeDropdown);
                    yield attrTypeElement[1].click(); //click on select option
                    yield page.waitForSelector(reportTypeoptionSelector);
                    const getAttrMenu = yield page.$$('.select-wmlt__option');
                    yield getAttrMenu[1].click(); //0 = 3 days,1=14 days,2=30 days
                    //start for Grroup by
                    yield page.waitForSelector(reportTypeDropdown, {
                        timeout: 30000,
                    });
                    const groupByElement = yield page.$$(reportTypeDropdown);
                    yield groupByElement[2].click(); //click on select option
                    yield page.waitForSelector(reportTypeoptionSelector);
                    const getGroupMenu = yield page.$$('.select-wmlt__option');
                    yield getGroupMenu[1].click(); //0=cumulative,1=daily
                    // Date Picker selection
                    yield page.waitForSelector('.date-range-clickable');
                    const dateRangeElement = yield page.$('.date-range-clickable');
                    yield dateRangeElement.click();
                    // await page.evaluate((element) => element.click(), dateRangeElement);
                    const startDate = start_date; //'03/01/2022'; // MM-dd-yyyy
                    const endDate = end_date; //'03/31/2022'; // MM-dd-yyyy
                    yield page.evaluate((startDate, endDate) => {
                        // Set the start date value
                        const startDateInput = document.querySelector('input[name="daterangepicker_start"]');
                        startDateInput.value = startDate;
                        // Set the end date value
                        const endtDateInput = document.querySelector('input[name="daterangepicker_end"]');
                        endtDateInput.value = endDate;
                        // Trigger the change event to update the date picker's selection
                        const event = new Event('change', { bubbles: true });
                        document
                            .querySelector('input[name="daterangepicker_end"]')
                            .dispatchEvent(event);
                    }, startDate, endDate);
                    yield page.waitForSelector('.applyBtn', {
                        visible: true,
                        timeout: 5000,
                    }); // Adjust the timeout as needed
                    yield page.click('.applyBtn');
                }
                // Get button for submit popup form
                const buttonSelector = 'button[data-automation-id="request-ondemand-report-button"]';
                yield page.waitForSelector(buttonSelector);
                const popUpButtonElement = yield page.$(buttonSelector);
                // Click the button
                yield popUpButtonElement.click();
                // const getOkayButton = 'button[data-automation-id="button-confirm-request"]';
                // await page.waitForSelector(getOkayButton);
                // const okayButtonElement = await page.$(getOkayButton);
                // await okayButtonElement.click();
                logger_1.scrapperLogger.info(`Report Generrated for advertiser ID is ${advertiserId}`);
                logger_1.scrapperLogger.info(`Report Generrated for start date ${start_date} and end date ${end_date}`);
                if (indexNumber === 3) {
                    yield advertiserReportBatchRepository.update({ id: advertiserBatchId }, { report_status: true });
                }
                this.isLoggedIn = false;
                logger_1.scrapperLogger.info('HERE IS FINALLY FOR BROWSER CLOSE');
                yield signINpage.browser.close();
                // signINpage.browser.close();
            }
            catch (e) {
                if (indexNumber === 3) {
                    yield advertiserReportBatchRepository.update({ id: advertiserBatchId }, { report_status: false });
                }
                this.isLoggedIn = false;
                logger_1.scrapperLogger.info('HERE IS FINALLY FOR BROWSER CLOSE');
                yield signINpage.browser.close();
                if (e) {
                    logger_1.scrapperLogger.info(`Error : advertiser ID is ${advertiserId}, SD ${start_date} and ED ${end_date}`);
                    yield this.requestReport(advertiserId, start_date, end_date, indexNumber, advertiserBatchId);
                    logger_1.scrapperLogger.info('============================================');
                    logger_1.scrapperLogger.info('Error Encounter Here');
                    logger_1.scrapperLogger.info('============================================');
                    // throw new Error(e);
                }
            }
        });
    }
    getTableRecords() {
        return __awaiter(this, void 0, void 0, function* () {
            let page;
            let browser;
            if (!this.isLoggedIn) {
                try {
                    const openingPage = yield this.signIn();
                    page = openingPage.page;
                    browser = openingPage.browser;
                }
                catch (error) {
                    return { error: 'Login failed' };
                }
            }
            const getStoreConfigs = yield this.getUserConfig();
            this.saveTableRecords(page, getStoreConfigs, browser);
            return {};
        });
    }
    saveTableRecords(page, finalAdvertiserArray, browser) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = new connection_1.DataSourceConnection();
            const advertiserRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserReports);
            for (let index = 0; index < finalAdvertiserArray.length; index++) {
                if (finalAdvertiserArray[index].sync_date != null) {
                    const advertiser_id = finalAdvertiserArray[index].advertiser_id;
                    const store_id = finalAdvertiserArray[index].store_id;
                    yield page.goto(`https://advertising.walmart.com/view/report/advertiser/${advertiser_id}/ondemand`, { waitUntil: 'networkidle2' });
                    yield page.waitForSelector('.react-bs-table-container tbody');
                    const hrefValues = yield page.$$eval('.react-bs-table-container tbody a', (anchors) => anchors.map((a) => a.href));
                    // Extract the report names from the table
                    const reportNames = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const reportNameCell = row.querySelector('td:nth-child(1)');
                            return reportNameCell.textContent.trim();
                        });
                    });
                    // Extract the attribution windows from the table
                    const attributionWindows = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const attributionWindowsCell = row.querySelector('td:nth-child(2)');
                            return attributionWindowsCell.textContent.trim();
                        });
                    });
                    // Extract the group by from the table
                    const groupBy = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const groupByCell = row.querySelector('td:nth-child(3)');
                            return groupByCell.textContent.trim();
                        });
                    });
                    // Extract the report start date on from the table
                    const report_start_date = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell = row.querySelector('td:nth-child(4)');
                            return requestedDateCell.textContent.trim();
                        });
                    });
                    // Extract the report end date on from the table
                    const report_end_date = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell = row.querySelector('td:nth-child(5)');
                            return requestedDateCell.textContent.trim();
                        });
                    });
                    // Extract the requested date on from the table
                    const requestedDate = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell = row.querySelector('td:nth-child(6)');
                            return requestedDateCell.textContent.trim();
                        });
                    });
                    const reportExpires = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell = row.querySelector('td:nth-child(7)');
                            return requestedDateCell.textContent.trim();
                        });
                    });
                    let days = '14 days';
                    let group = 'Daily';
                    if (this.indexNumber === 5) {
                        days = 'N/A';
                        group = 'N/A';
                    }
                    // console.log(group,days,this.reportType);
                    // const requestedDateTime = moment('09/01/2023 3:20 am', 'MM/DD/YYYY hh:mm a');
                    for (let hrefIndex = 0; hrefIndex < hrefValues.length; hrefIndex++) {
                        if (attributionWindows[hrefIndex] === days &&
                            groupBy[hrefIndex] === group &&
                            reportNames[hrefIndex] === this.reportType &&
                            reportExpires[hrefIndex] === 'In 3 days') {
                            let formattedStartDate;
                            let formattedEndDate;
                            if (this.indexNumber === 3) {
                                formattedStartDate = (0, moment_1.default)(report_start_date[hrefIndex], 'MMM DD, YYYY').format('YYYY-MM-DD');
                                formattedEndDate = (0, moment_1.default)(report_end_date[hrefIndex], 'MMM DD, YYYY').format('YYYY-MM-DD');
                            }
                            else if (this.indexNumber === 5) {
                                formattedStartDate = null;
                                formattedEndDate = null;
                            }
                            const url = hrefValues[hrefIndex];
                            const removeParameters = url.split('?')[1];
                            const uid = url.split('/')[4];
                            const updatedUID = uid.replace(`?${removeParameters}`, ''); // UID
                            const fileName = url.split('?fileName=')[1]; // File name
                            const _checkUIDExists = yield advertiserRepository;
                            let checkUIDExists;
                            if (this.indexNumber === 5) {
                                checkUIDExists = yield _checkUIDExists.findOne({
                                    where: {
                                        store_id: store_id,
                                        csv_url: hrefValues[hrefIndex],
                                    },
                                });
                            }
                            else if (this.indexNumber === 3) {
                                checkUIDExists = yield _checkUIDExists.findOne({
                                    where: {
                                        report_start_date: formattedStartDate,
                                        report_end_date: formattedEndDate,
                                        store_id: store_id,
                                        // csv_url: hrefValues[hrefIndex],
                                    },
                                });
                            }
                            if (checkUIDExists === null) {
                                const advertiser = {
                                    uid: updatedUID,
                                    filename: fileName,
                                    url_code: advertiser_id,
                                    report_name: reportNames[hrefIndex],
                                    attribution_window: attributionWindows[hrefIndex],
                                    report_start_date: formattedStartDate,
                                    report_end_date: formattedEndDate,
                                    group_by: groupBy[hrefIndex],
                                    requested_data: requestedDate[hrefIndex],
                                    status: 'pending',
                                    csv_url: hrefValues[hrefIndex],
                                    store_id: store_id,
                                };
                                logger_1.scrapperLogger.info(`Here we're inserting the advertiser table records : `, advertiser);
                                const saveAdvertiser = advertiserRepository.create(advertiser);
                                yield advertiserRepository.save(saveAdvertiser);
                            }
                        }
                    }
                }
            }
            this.isLoggedIn = false;
            yield browser.close();
        });
    }
    getUserConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            // Below Code is for connection to table
            const connection = new connection_1.DataSourceConnection();
            const usersSettingRepository = (yield connection.publicConnection()).getRepository(Index_1.UsersSettings);
            // Below Code is for getting User Settings Data
            const userSettings = yield usersSettingRepository
                .createQueryBuilder('userSettings')
                .select('userSettings.store_id', 'store_id')
                .addSelect('userSettings.id', 'userSettingID')
                .addSelect('am.advertiser_id', 'advertiser_id')
                .addSelect('am.sync_date', 'sync_date')
                .addSelect('am.id', 'advertiserId')
                .leftJoin('advertiser_management', 'am', 'am.user_setting_id = userSettings.id')
                .where('am.is_verify = :is_verify', { is_verify: true })
                .andWhere('am.is_deleted = :is_deleted', { is_deleted: false })
                .getRawMany();
            return userSettings;
        });
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info('Advertiser Save csv data start');
            const storeRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            // const advertiserReportRepository = (await this.publicConnection()).getRepository(AdvertiserReports);
            const getStore = yield storeRepository
                .createQueryBuilder('store_config')
                .select('store_config.*, adv.*')
                .leftJoin('advertiser_reports', 'adv', 'store_config.id = adv.store_id')
                .where('store_config.is_active = :is_active', { is_active: true })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .andWhere('adv.report_name = :report_name', {
                report_name: 'Item Performance',
            })
                .andWhere('adv.id IS NOT NULL')
                .andWhere('adv.status = :status', { status: 'pending' })
                .andWhere('adv.s3_status IS NULL')
                // .andWhere('adv.store_id = :store_id', { store_id: 337 })
                .getRawMany();
            try {
                for (let index = 0; index < getStore.length; index++) {
                    const advertiserReportData = getStore[index];
                    const jobDataForDownload = {
                        csv_url: advertiserReportData.csv_url,
                        user_id: advertiserReportData.user_id,
                        store_id: advertiserReportData.store_id,
                        store_name: advertiserReportData.store_name,
                        id: advertiserReportData.id,
                    };
                    // console.log("jobDataForDownload --> ", jobDataForDownload);
                    yield queueService_1.advertiserQueue.add('downloadItemPerformance', jobDataForDownload);
                    // const jobState = await job.getState()
                    // console.log("jobState====>", jobState)
                }
            }
            catch (error) {
                return [error];
            }
            return getStore;
        });
    }
    itemFileMoveToAws() {
        return __awaiter(this, void 0, void 0, function* () {
            const storeRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const getStore = yield storeRepository
                .createQueryBuilder('store_config')
                .select('store_config.*, adv.*')
                .leftJoin('advertiser_reports', 'adv', 'store_config.id = adv.store_id')
                .where('store_config.is_active = :is_active', { is_active: true })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .andWhere('adv.report_name = :report_name', {
                report_name: 'Item Performance',
            })
                .andWhere('adv.id IS NOT NULL')
                .andWhere('adv.status = :status', { status: 'pending' })
                .andWhere('adv.s3_status = :s3_status', {
                s3_status: 'Ready to move',
            })
                // .andWhere('adv.store_id = :store_id', { store_id: 337 })
                .getRawMany();
            for (let index = 0; index < getStore.length; index++) {
                const dirName = path_1.default.join(__dirname, `../../${getStore[index].downloaded_path}`);
                const awsMovePath = `${getStore[index].store_id}/${getStore[index].user_id}/${getStore[index].filename}`;
                const moveToAWSObj = {
                    dirName: dirName,
                    awsMovePath: awsMovePath,
                    advertiserid: getStore[index].id,
                    s3_status: 'Moved to s3',
                };
                yield queueService_1.advertiserQueue.add('moveToAWS', moveToAWSObj);
                // return {}
                // const awsService = new AwsService();
                // await awsService.uploadToS3(
                //     `${getStore[index].store_id}/${getStore[index].user_id}/${getStore[index].filename}`,
                //     dirName,
                // );
                // adReportRepository.update(
                //     { id: getStore[index].id },
                //     {
                //         s3_status: 'Moved to s3',
                //     },
                // );
                // fs.unlink(dirName, (err) => {
                //     logger.info(err);
                // });
            }
            return { message: 'Queue is in process' };
        });
    }
    extractCSVFileData(advData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const s3FilePath = `${advData.store_id}/${advData.user_id}/${advData.filename}`;
                logger_1.scrapperLogger.info('s3FilePath', s3FilePath);
                const awsService = new awsService_1.AwsService();
                const s3Response = yield awsService.readCSV(s3FilePath);
                const bodyContents = yield (0, utils_1.streamToString)(s3Response.Body);
                const csvDatas = yield bodyContents;
                return { status: 200, data: csvDatas };
            }
            catch (er) {
                logger_1.scrapperLogger.info('Error : ', er);
            }
        });
    }
    readCsvData() {
        return __awaiter(this, void 0, void 0, function* () {
            const storeRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const advertiserReportRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserReports);
            const getStore = yield storeRepository
                .createQueryBuilder('store_config')
                .select('store_config.*, adv.*')
                .leftJoin('advertiser_reports', 'adv', 'store_config.id = adv.store_id')
                .where('store_config.is_active = :is_active', { is_active: true })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .andWhere('adv.report_name = :report_name', {
                report_name: 'Item Performance',
            })
                .andWhere('adv.id IS NOT NULL')
                .andWhere('adv.status = :status', { status: 'pending' })
                .andWhere('adv.s3_status = :s3_status', {
                s3_status: 'Moved to s3',
            })
                // .andWhere('adv.store_id = :store_id', { store_id: 337 })
                .getRawMany();
            // console.log("getStore", getStore);
            try {
                for (let index = 0; index < getStore.length; index++) {
                    const advertiserReportData = getStore[index];
                    const store_name = `default_${advertiserReportData.user_id}`;
                    yield advertiserReportRepository.update({ id: advertiserReportData.id }, { status: 'process' });
                    const advertiserRepository = (yield this.connection(store_name)).getRepository(Index_1.Advertisers);
                    const result = yield this.extractCSVFileData(advertiserReportData);
                    if (result['status'] === 200) {
                        const csvData = result['data'];
                        const dataResult = yield Promise.all(csvData.map((data) => __awaiter(this, void 0, void 0, function* () {
                            const advertiseData = {
                                date: data['Date'],
                                campaign_name: data['Campaign Name'],
                                campaign_id: data['Campaign Id'],
                                ad_group_name: data['Ad Group Name'],
                                ad_group_id: data['Ad Group Id'],
                                item_name: data['Item Name'],
                                item_id: data['Item Id'],
                                search_keyword: data['Searched Keyword'],
                                bidded_keyword: data['Bidded Keyword'],
                                match_type: data['Match Type'],
                                impressions: data['Impressions'],
                                clicks: data['Clicks'],
                                ctr: data['CTR'],
                                ad_spend: data['Ad Spend'],
                                conversion_rate: data['Conversion Rate (Units Sold Based)'],
                                orders: data['Orders'],
                                conversion_rate_order_based: data['Conversion Rate (Orders Based)'],
                                total_attributed_sales: data['Total Attributed Sales'],
                                advertised_sku_sales: data['Advertised SKU Sales'],
                                other_sku_sales: data['Other SKU Sales'],
                                units_sold: data['Units Sold'],
                                advertise_sku_units: data['Advertised SKU Units (#)'],
                                other_sku_units: data['Other SKU Units (#)'],
                                roas: data['RoAS'],
                                store_id: advertiserReportData.store_id,
                                advertiser_report_id: advertiserReportData.id,
                            };
                            const checkAdvData = yield advertiserRepository.findOne({
                                where: {
                                    date: data['Date'],
                                    campaign_id: data['Campaign Id'],
                                    ad_group_id: data['Ad Group Id'],
                                    item_id: data['Item Id'],
                                    store_id: advertiserReportData.store_id,
                                },
                            });
                            if (checkAdvData) {
                                advertiseData['id'] = checkAdvData.id;
                            }
                            return advertiseData;
                        })));
                        yield advertiserReportRepository.update({ id: advertiserReportData.id }, { status: 'complete' });
                        logger_1.default.info(`Here is the all records, ${dataResult.length}`);
                        yield advertiserRepository.save(dataResult, { chunk: 200 });
                    }
                    else if (result['status'] === 500) {
                        yield advertiserReportRepository.update({ id: advertiserReportData.id }, { status: 'failed' });
                    }
                    // (await this.connection(store_name)).destroy();
                }
                // (await this.publicConnection()).destroy();
            }
            catch (error) {
                logger_1.scrapperLogger.info('error', error);
                return [error];
            }
            return getStore;
        });
    }
    generateCampaignReport() {
        this.indexNumber = 5;
        this.index();
        return {};
    }
    getCampaignTableRecords() {
        return __awaiter(this, void 0, void 0, function* () {
            this.reportType = 'Campaign Snapshot';
            this.indexNumber = 5;
            this.getTableRecords();
            return {};
        });
    }
    downloadFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const storeRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const getStore = yield storeRepository
                .createQueryBuilder('store_config')
                .select('store_config.*, adv.*')
                .leftJoin('advertiser_reports', 'adv', 'store_config.id = adv.store_id')
                .where('store_config.is_active = :is_active', { is_active: true })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .andWhere('adv.report_name = :report_name', {
                report_name: 'Campaign Snapshot',
            })
                .andWhere('adv.id IS NOT NULL')
                .andWhere('adv.status = :status', { status: 'pending' })
                .getRawMany();
            try {
                for (let index = 0; index < getStore.length; index++) {
                    const advertiserReportData = getStore[index];
                    const jobDataForDownload = {
                        csv_url: advertiserReportData.csv_url,
                        user_id: advertiserReportData.user_id,
                        store_id: advertiserReportData.store_id,
                        store_name: advertiserReportData.store_name,
                        id: advertiserReportData.id,
                    };
                    yield queueService_1.advertiserQueue.add('downloadItemPerformance', jobDataForDownload);
                    const advertiserReportRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserReports);
                    yield advertiserReportRepository.update({ id: advertiserReportData.id }, { status: 'downloaded' });
                }
            }
            catch (error) {
                return [error];
            }
            return {};
        });
    }
    extractCampaignZip() {
        return __awaiter(this, void 0, void 0, function* () {
            const advertiserReportRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserReports);
            const storeRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const getStore = yield storeRepository
                .createQueryBuilder('store_config')
                .select('store_config.*, adv.*')
                .leftJoin('advertiser_reports', 'adv', 'store_config.id = adv.store_id')
                .where('store_config.is_active = :is_active', { is_active: true })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .andWhere('adv.report_name = :report_name', {
                report_name: 'Campaign Snapshot',
            })
                .andWhere('adv.id IS NOT NULL')
                .andWhere('adv.status = :status', { status: 'downloaded' })
                .getRawMany();
            for (let index = 0; index < getStore.length; index++) {
                // console.log(getStore[index].filename);
                const fileName = path_1.default.join(__dirname, `../../dist/${getStore[index].store_id}/${getStore[index].user_id}/${getStore[index].filename}.zip`);
                const filePath = path_1.default.join(__dirname, `../../dist/${getStore[index].store_id}/${getStore[index].user_id}`);
                const zip = new adm_zip_1.default(fileName);
                const extractedFile = zip.getEntries();
                const newName = `${getStore[index].filename}`;
                extractedFile[0].entryName = newName;
                zip.extractAllTo(filePath, true);
                fs_1.default.unlink(`${fileName}`, (err) => {
                    logger_1.default.info(err);
                });
                yield advertiserReportRepository.update({ id: getStore[index].id }, { status: 'extracted' });
            }
            return {};
        });
    }
    saveCampaignJsonFileData() {
        return __awaiter(this, void 0, void 0, function* () {
            const advertiserReportRepository = (yield this.publicConnection()).getRepository(Index_1.AdvertiserReports);
            const storeRepository = (yield this.publicConnection()).getRepository(Index_1.StoreConfig);
            const getStore = yield storeRepository
                .createQueryBuilder('store_config')
                .select('store_config.*, adv.*')
                .leftJoin('advertiser_reports', 'adv', 'store_config.id = adv.store_id')
                .where('store_config.is_active = :is_active', { is_active: true })
                .andWhere('store_config.is_deleted = :is_deleted', {
                is_deleted: false,
            })
                .andWhere('adv.report_name = :report_name', {
                report_name: 'Campaign Snapshot',
            })
                .andWhere('adv.id IS NOT NULL')
                .andWhere('adv.status = :status', { status: 'extracted' })
                .getRawMany();
            getStore.map((campaignshot) => __awaiter(this, void 0, void 0, function* () {
                // console.log(campaignshot);
                const fileName = path_1.default.join(__dirname, `../../dist/${campaignshot.store_id}/${campaignshot.user_id}/${campaignshot.filename}`);
                const jsonData = yield this.readJsonFile(fileName);
                const schema_name = `${campaignshot.store_name}`;
                const campaignSnapShotRepository = (yield this.connection(schema_name)).getRepository(Index_1.CampaignSnapshot);
                yield Promise.all(jsonData['campaigns'].map((campaign) => __awaiter(this, void 0, void 0, function* () {
                    const checkCampaignExist = yield campaignSnapShotRepository.findOne({
                        where: {
                            campaign_id: campaign.campaignId,
                            store_id: campaignshot.store_id,
                        },
                    });
                    const campaignData = {
                        name: campaign.name,
                        campaign_type: campaign.campaignType,
                        targeting_type: campaign.targetingType,
                        status: campaign.status,
                        budget_type: campaign.budgetType,
                        start_date: campaign.startDate,
                        end_date: campaign.endDate,
                        total_budget: campaign.totalBudget,
                        daily_budget: campaign.dailyBudget,
                        rollover: campaign.rollover,
                        advertiser_id: campaign.advertiserId,
                        campaign_id: campaign.campaignId,
                        channel: campaign.channel,
                        store_id: campaignshot.store_id,
                    };
                    if (checkCampaignExist) {
                        campaignData['id'] = checkCampaignExist.id;
                    }
                    yield campaignSnapShotRepository.save(campaignData);
                    yield advertiserReportRepository.update({ id: campaignshot.id }, { status: 'complete' });
                })));
                fs_1.default.unlink(`${fileName}`, (err) => {
                    logger_1.default.info(err);
                });
            }));
            return {};
        });
    }
    readJsonFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs_1.default.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        try {
                            const jsonData = JSON.parse(data);
                            resolve(jsonData);
                        }
                        catch (parseError) {
                            reject(parseError);
                        }
                    }
                });
            });
        });
    }
    delay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => setTimeout(resolve, ms));
        });
    }
    generateItemReport() {
        this.indexNumber = 3;
        this.index();
        return {};
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/verify-advertiser-id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "checkGenerateReportUrl", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-table-records'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "getTableRecords", null);
__decorate([
    (0, routing_controllers_1.Get)('/save-csv-data'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "getData", null);
__decorate([
    (0, routing_controllers_1.Get)('/move-to-aws'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "itemFileMoveToAws", null);
__decorate([
    (0, routing_controllers_1.Get)('/read-csv-data'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "readCsvData", null);
__decorate([
    (0, routing_controllers_1.Get)('/generate-campaign-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Scrapper.prototype, "generateCampaignReport", null);
__decorate([
    (0, routing_controllers_1.Get)('/get-campaign-table-records'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "getCampaignTableRecords", null);
__decorate([
    (0, routing_controllers_1.Get)('/download-campaign-files'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "downloadFile", null);
__decorate([
    (0, routing_controllers_1.Get)('/extract-campaign-zip'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "extractCampaignZip", null);
__decorate([
    (0, routing_controllers_1.Get)('/save-campaignJsonFileData'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "saveCampaignJsonFileData", null);
__decorate([
    (0, routing_controllers_1.Get)('/generate-item-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Scrapper.prototype, "generateItemReport", null);
Scrapper = __decorate([
    (0, routing_controllers_1.JsonController)('/scapper')
], Scrapper);
exports.Scrapper = Scrapper;
//# sourceMappingURL=scrapperController.js.map