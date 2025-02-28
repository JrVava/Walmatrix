import puppeteer from 'puppeteer';
import { Get, JsonController } from 'routing-controllers';
import { DataSourceConnection } from '../connection';
// import csv from 'csv-parser';
import moment from 'moment';
import { config } from '../config';
import {
    Advertisers,
    AdvertiserReports,
    StoreConfig,
    UsersSettings,
    CampaignSnapshot,
    AdvertiserManagement,
    AdvertiserReportBatch,
} from '../entity/Index';
import fs from 'fs';
// import { pipeline } from 'stream';
// import { promisify } from 'util';
import AdmZip from 'adm-zip';
import path from 'path';
import logger, { scrapperLogger } from '../service/logger';
import { advertiserQueue } from '../service/queueService';
import { dateRecursive, streamToString } from './../modules/utils';
import { AwsService } from '../service/awsService';

// const fs = require('fs');
// import fs from "fs"

// const asyncPipeline = promisify(pipeline);

@JsonController('/scapper')
export class Scrapper extends DataSourceConnection {
    public isLoggedIn = false as boolean;
    public reportType = 'Item Performance';
    public indexNumber = 3;

    async signIn() {
        const getConfig = config.advertiserCredentials;
        let browser;
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

        const usernameInput = await page.waitForSelector('input[type=text]');
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
        this.isLoggedIn = true;
        return { page: page, browser: browser };
    }

    async index() {
        const publicConnection = await this.publicConnection();
        const advertiserReportBatchRepository = publicConnection.getRepository(
            AdvertiserReportBatch,
        );
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
        const getStoreConfigs = await this.getUserConfig();
        // scrapperLogger.info(getStoreConfigs)
        for (let index = 0; index < getStoreConfigs.length; index++) {
            const sync_date = getStoreConfigs[index].sync_date; // Get the sync date from the user settings table
            const getDate = dateRecursive(sync_date); // YYYY-MM-DD This will call Recursive function
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
                    advertiser_management_id:
                        getStoreConfigs[index].advertiserId,
                    start_date: start_date,
                    end_date: end_date,
                };
                const getAdvertiserReportBatchId =
                    await advertiserReportBatchRepository.save(
                        advertiser_report_batchOBJ,
                    );
                const advertiserData = {
                    start_date: start_date,
                    end_date: end_date,
                    advertiserId: advertiserId,
                    ad_id: getStoreConfigs[index].advertiserId,
                    indexNumber: this.indexNumber,
                    advertiserBatchId: getAdvertiserReportBatchId.id,
                };

                await advertiserQueue.add('generateReport', advertiserData);
                scrapperLogger.info(
                    `advertiserId : ${advertiserId} -> start_date : ${start_date} - end_date : ${end_date}`,
                );
                // await this.requestReport(page, advertiserId, start_date, end_date);
                if (this.indexNumber === 3) {
                    const advertiserManagementRepository =
                        publicConnection.getRepository(AdvertiserManagement);
                    await advertiserManagementRepository.update(
                        { id: getStoreConfigs[index].advertiserId },
                        { sync_date: end_date },
                    );
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
    }

    @Get('/verify-advertiser-id')
    async checkGenerateReportUrl() {
        let page;
        let browser;
        if (!this.isLoggedIn) {
            try {
                const openingPage = await this.signIn();
                page = openingPage.page;
                browser = openingPage.browser;
            } catch (error) {
                scrapperLogger.info(
                    '🚀 ~ file: scrapperController.ts:193 ~ Scrapper ~ checkGenerateReportUrl ~ error:',
                    error,
                );
                return { error: 'Login failed' };
            }
        }
        const connection = new DataSourceConnection();
        const advertiserManagementRepository = (
            await connection.publicConnection()
        ).getRepository(AdvertiserManagement);
        const getAdvertiser = await advertiserManagementRepository
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
            await page.goto(
                `https://advertising.walmart.com/view/report/advertiser/${getAdvertiser[index].advertiser_id}/ondemand`,
                { waitUntil: 'networkidle2' },
            );
            await this.delay(3000);
            const pageContent = await page.content();
            if (!pageContent.includes('This page does not exist')) {
                logger.info(getAdvertiser[index].id);
                logger.info('========================================');
                await advertiserManagementRepository.update(
                    { id: getAdvertiser[index].id },
                    { is_verify: true },
                );
            }
        }
        this.isLoggedIn = false;
        await browser.close();
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
    }

    async requestReport(
        advertiserId,
        start_date,
        end_date,
        indexNumber,
        advertiserBatchId,
    ) {
        const connection = new DataSourceConnection();
        const advertiserReportBatchRepository = (
            await connection.publicConnection()
        ).getRepository(AdvertiserReportBatch);

        const signINpage = await this.signIn();
        const page = signINpage.page;
        scrapperLogger.info('URL IS OPENING');
        await page.goto(
            `https://advertising.walmart.com/view/report/advertiser/${advertiserId}/ondemand`,
            { waitUntil: 'networkidle0' },
        );
        scrapperLogger.info('URL IS LOADED');
        const buttonSelector =
            'button[data-automation-id="button-open-request-modal"]';
        await page.waitForSelector(buttonSelector);
        const button = await page.$(buttonSelector);
        await button.click();
        scrapperLogger.info(`Request report button clicked`);
        // await this.generateReport(page, start_date, end_date, advertiserId);
        // }

        // async generateReport(page, start_date, end_date, advertiserId) {
        try {
            scrapperLogger.info('Enter in generateReport function ');
            const reportTypeDropdown = '.select-wmlt';
            await page.waitForSelector(reportTypeDropdown, { timeout: 30000 });
            const reportTypeElement = await page.$$(reportTypeDropdown);
            //get options for 1 select report type
            reportTypeElement[0].click();
            const reportTypeoptionSelector = '.select-wmlt__menu-list';
            await page.waitForSelector(reportTypeoptionSelector);
            const getMenu = await page.$$('.select-wmlt__option');
            await getMenu[indexNumber].click();
            // console.log('this.indexNumber', indexNumber);
            if (indexNumber === 3) {
                //Start for attribution window
                await page.waitForSelector(reportTypeDropdown, {
                    timeout: 30000,
                });
                const attrTypeElement = await page.$$(reportTypeDropdown);
                await attrTypeElement[1].click(); //click on select option
                await page.waitForSelector(reportTypeoptionSelector);
                const getAttrMenu = await page.$$('.select-wmlt__option');
                await getAttrMenu[1].click(); //0 = 3 days,1=14 days,2=30 days
                //start for Grroup by
                await page.waitForSelector(reportTypeDropdown, {
                    timeout: 30000,
                });
                const groupByElement = await page.$$(reportTypeDropdown);
                await groupByElement[2].click(); //click on select option
                await page.waitForSelector(reportTypeoptionSelector);
                const getGroupMenu = await page.$$('.select-wmlt__option');
                await getGroupMenu[1].click(); //0=cumulative,1=daily

                // Date Picker selection
                await page.waitForSelector('.date-range-clickable');

                const dateRangeElement = await page.$('.date-range-clickable');
                await dateRangeElement.click();

                // await page.evaluate((element) => element.click(), dateRangeElement);

                const startDate = start_date; //'03/01/2022'; // MM-dd-yyyy
                const endDate = end_date; //'03/31/2022'; // MM-dd-yyyy

                await page.evaluate(
                    (startDate, endDate) => {
                        // Set the start date value
                        const startDateInput = document.querySelector(
                            'input[name="daterangepicker_start"]',
                        ) as HTMLInputElement;
                        startDateInput.value = startDate;
                        // Set the end date value
                        const endtDateInput = document.querySelector(
                            'input[name="daterangepicker_end"]',
                        ) as HTMLInputElement;
                        endtDateInput.value = endDate;

                        // Trigger the change event to update the date picker's selection
                        const event = new Event('change', { bubbles: true });
                        document
                            .querySelector('input[name="daterangepicker_end"]')
                            .dispatchEvent(event);
                    },
                    startDate,
                    endDate,
                );
                await page.waitForSelector('.applyBtn', {
                    visible: true,
                    timeout: 5000,
                }); // Adjust the timeout as needed
                await page.click('.applyBtn');
            }

            // Get button for submit popup form
            const buttonSelector =
                'button[data-automation-id="request-ondemand-report-button"]';
            await page.waitForSelector(buttonSelector);
            const popUpButtonElement = await page.$(buttonSelector);
            // Click the button
            await popUpButtonElement.click();

            // const getOkayButton = 'button[data-automation-id="button-confirm-request"]';
            // await page.waitForSelector(getOkayButton);
            // const okayButtonElement = await page.$(getOkayButton);
            // await okayButtonElement.click();
            scrapperLogger.info(
                `Report Generrated for advertiser ID is ${advertiserId}`,
            );
            scrapperLogger.info(
                `Report Generrated for start date ${start_date} and end date ${end_date}`,
            );
            if (indexNumber === 3) {
                await advertiserReportBatchRepository.update(
                    { id: advertiserBatchId },
                    { report_status: true },
                );
            }
            this.isLoggedIn = false;
            scrapperLogger.info('HERE IS FINALLY FOR BROWSER CLOSE');
            await signINpage.browser.close();
            // signINpage.browser.close();
        } catch (e) {
            if (indexNumber === 3) {
                await advertiserReportBatchRepository.update(
                    { id: advertiserBatchId },
                    { report_status: false },
                );
            }
            this.isLoggedIn = false;
            scrapperLogger.info('HERE IS FINALLY FOR BROWSER CLOSE');
            await signINpage.browser.close();
            if (e) {
                scrapperLogger.info(
                    `Error : advertiser ID is ${advertiserId}, SD ${start_date} and ED ${end_date}`,
                );
                await this.requestReport(
                    advertiserId,
                    start_date,
                    end_date,
                    indexNumber,
                    advertiserBatchId,
                );

                scrapperLogger.info(
                    '============================================',
                );
                scrapperLogger.info('Error Encounter Here');
                scrapperLogger.info(
                    '============================================',
                );
                // throw new Error(e);
            }
        }
    }

    @Get('/get-table-records')
    async getTableRecords() {
        let page;
        let browser;
        if (!this.isLoggedIn) {
            try {
                const openingPage = await this.signIn();
                page = openingPage.page;
                browser = openingPage.browser;
            } catch (error) {
                return { error: 'Login failed' };
            }
        }
        const getStoreConfigs = await this.getUserConfig();

        this.saveTableRecords(page, getStoreConfigs, browser);
        return {};
    }

    async saveTableRecords(page, finalAdvertiserArray, browser) {
        const connection = new DataSourceConnection();
        const advertiserRepository = (
            await connection.publicConnection()
        ).getRepository(AdvertiserReports);

        for (let index = 0; index < finalAdvertiserArray.length; index++) {
            if (finalAdvertiserArray[index].sync_date != null) {
                const advertiser_id = finalAdvertiserArray[index].advertiser_id;
                const store_id = finalAdvertiserArray[index].store_id;
                await page.goto(
                    `https://advertising.walmart.com/view/report/advertiser/${advertiser_id}/ondemand`,
                    { waitUntil: 'networkidle2' },
                );

                await page.waitForSelector('.react-bs-table-container tbody');
                const hrefValues = await page.$$eval(
                    '.react-bs-table-container tbody a',
                    (anchors) => anchors.map((a) => a.href),
                );

                // Extract the report names from the table
                const reportNames = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const reportNameCell =
                                row.querySelector('td:nth-child(1)');
                            return reportNameCell.textContent.trim();
                        });
                    },
                );

                // Extract the attribution windows from the table
                const attributionWindows = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const attributionWindowsCell =
                                row.querySelector('td:nth-child(2)');
                            return attributionWindowsCell.textContent.trim();
                        });
                    },
                );

                // Extract the group by from the table
                const groupBy = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const groupByCell =
                                row.querySelector('td:nth-child(3)');
                            return groupByCell.textContent.trim();
                        });
                    },
                );

                // Extract the report start date on from the table
                const report_start_date = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell =
                                row.querySelector('td:nth-child(4)');
                            return requestedDateCell.textContent.trim();
                        });
                    },
                );

                // Extract the report end date on from the table
                const report_end_date = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell =
                                row.querySelector('td:nth-child(5)');
                            return requestedDateCell.textContent.trim();
                        });
                    },
                );

                // Extract the requested date on from the table
                const requestedDate = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell =
                                row.querySelector('td:nth-child(6)');
                            return requestedDateCell.textContent.trim();
                        });
                    },
                );

                const reportExpires = await page.$$eval(
                    '.react-bs-table tbody tr',
                    (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell =
                                row.querySelector('td:nth-child(7)');
                            return requestedDateCell.textContent.trim();
                        });
                    },
                );

                let days = '14 days';
                let group = 'Daily';
                if (this.indexNumber === 5) {
                    days = 'N/A';
                    group = 'N/A';
                }
                // console.log(group,days,this.reportType);
                // const requestedDateTime = moment('09/01/2023 3:20 am', 'MM/DD/YYYY hh:mm a');

                for (
                    let hrefIndex = 0;
                    hrefIndex < hrefValues.length;
                    hrefIndex++
                ) {
                    if (
                        attributionWindows[hrefIndex] === days &&
                        groupBy[hrefIndex] === group &&
                        reportNames[hrefIndex] === this.reportType &&
                        reportExpires[hrefIndex] === 'In 3 days'
                    ) {
                        let formattedStartDate;
                        let formattedEndDate;
                        if (this.indexNumber === 3) {
                            formattedStartDate = moment(
                                report_start_date[hrefIndex],
                                'MMM DD, YYYY',
                            ).format('YYYY-MM-DD');
                            formattedEndDate = moment(
                                report_end_date[hrefIndex],
                                'MMM DD, YYYY',
                            ).format('YYYY-MM-DD');
                        } else if (this.indexNumber === 5) {
                            formattedStartDate = null;
                            formattedEndDate = null;
                        }

                        const url = hrefValues[hrefIndex];
                        const removeParameters = url.split('?')[1];
                        const uid = url.split('/')[4];

                        const updatedUID = uid.replace(
                            `?${removeParameters}`,
                            '',
                        ); // UID
                        const fileName = url.split('?fileName=')[1]; // File name
                        const _checkUIDExists = await advertiserRepository;
                        let checkUIDExists;
                        if (this.indexNumber === 5) {
                            checkUIDExists = await _checkUIDExists.findOne({
                                where: {
                                    store_id: store_id,
                                    csv_url: hrefValues[hrefIndex],
                                },
                            });
                        } else if (this.indexNumber === 3) {
                            checkUIDExists = await _checkUIDExists.findOne({
                                where: {
                                    report_start_date: formattedStartDate,
                                    report_end_date: formattedEndDate,
                                    store_id: store_id,
                                    // csv_url: hrefValues[hrefIndex],
                                },
                            });
                        }
                        if (checkUIDExists === null) {
                            const advertiser: Partial<AdvertiserReports> = {
                                uid: updatedUID,
                                filename: fileName,
                                url_code: advertiser_id,
                                report_name: reportNames[hrefIndex],
                                attribution_window:
                                    attributionWindows[hrefIndex],
                                report_start_date: formattedStartDate,
                                report_end_date: formattedEndDate,
                                group_by: groupBy[hrefIndex],
                                requested_data: requestedDate[hrefIndex],
                                status: 'pending',
                                csv_url: hrefValues[hrefIndex],
                                store_id: store_id,
                            };
                            scrapperLogger.info(
                                `Here we're inserting the advertiser table records : `,
                                advertiser,
                            );
                            const saveAdvertiser =
                                advertiserRepository.create(advertiser);
                            await advertiserRepository.save(saveAdvertiser);
                        }
                    }
                }
            }
        }
        this.isLoggedIn = false;
        await browser.close();
    }

    async getUserConfig() {
        // Below Code is for connection to table
        const connection = new DataSourceConnection();
        const usersSettingRepository = (
            await connection.publicConnection()
        ).getRepository(UsersSettings);

        // Below Code is for getting User Settings Data
        const userSettings = await usersSettingRepository
            .createQueryBuilder('userSettings')
            .select('userSettings.store_id', 'store_id')
            .addSelect('userSettings.id', 'userSettingID')
            .addSelect('am.advertiser_id', 'advertiser_id')
            .addSelect('am.sync_date', 'sync_date')
            .addSelect('am.id', 'advertiserId')
            .leftJoin(
                'advertiser_management',
                'am',
                'am.user_setting_id = userSettings.id',
            )
            .where('userSettings.scrapper_disable = :scrapper_disable', {
                scrapper_disable: false,
            })
            .where('am.is_verify = :is_verify', { is_verify: true })
            .andWhere('am.is_deleted = :is_deleted', { is_deleted: false })
            .getRawMany();
        return userSettings;
    }

    @Get('/save-csv-data')
    async getData() {
        logger.info('Advertiser Save csv data start');
        const publicConnection = await this.publicConnection();
        const storeRepository = publicConnection.getRepository(StoreConfig);

        // const advertiserReportRepository = (await this.publicConnection()).getRepository(AdvertiserReports);
        const getStore = await storeRepository
            .createQueryBuilder('store_config')
            .select('store_config.*, adv.*')
            .leftJoin(
                'advertiser_reports',
                'adv',
                'store_config.id = adv.store_id',
            )
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
                await advertiserQueue.add(
                    'downloadItemPerformance',
                    jobDataForDownload,
                );
                // const jobState = await job.getState()
                // console.log("jobState====>", jobState)
            }
        } catch (error) {
            return [error];
        }
        return getStore;
    }

    @Get('/move-to-aws')
    async itemFileMoveToAws() {
        const publicConnection = await this.publicConnection();
        const storeRepository = publicConnection.getRepository(StoreConfig);
        const getStore = await storeRepository
            .createQueryBuilder('store_config')
            .select('store_config.*, adv.*')
            .leftJoin(
                'advertiser_reports',
                'adv',
                'store_config.id = adv.store_id',
            )
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
            const dirName = path.join(
                __dirname,
                `../../${getStore[index].downloaded_path}`,
            );
            const awsMovePath = `${getStore[index].store_id}/${getStore[index].user_id}/${getStore[index].filename}`;
            const moveToAWSObj = {
                dirName: dirName,
                awsMovePath: awsMovePath,
                advertiserid: getStore[index].id,
                s3_status: 'Moved to s3',
            };

            await advertiserQueue.add('moveToAWS', moveToAWSObj);
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
    }

    async extractCSVFileData(advData) {
        try {
            const s3FilePath = `${advData.store_id}/${advData.user_id}/${advData.filename}`;
            scrapperLogger.info('s3FilePath', s3FilePath);
            const awsService = new AwsService();
            const s3Response = await awsService.readCSV(s3FilePath);
            const bodyContents = await streamToString(s3Response.Body);
            const csvDatas: any = await bodyContents;
            return { status: 200, data: csvDatas };
        } catch (er) {
            scrapperLogger.info('Error : ', er);
        }
    }

    @Get('/read-csv-data')
    async readCsvData() {
        const publicConnection = await this.publicConnection();
        const storeRepository = publicConnection.getRepository(StoreConfig);
        const advertiserReportRepository =
            publicConnection.getRepository(AdvertiserReports);

        const getStore = await storeRepository
            .createQueryBuilder('store_config')
            .select('store_config.*, adv.*')
            .leftJoin(
                'advertiser_reports',
                'adv',
                'store_config.id = adv.store_id',
            )
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
                await advertiserReportRepository.update(
                    { id: advertiserReportData.id },
                    { status: 'process' },
                );

                const advertiserRepository = (
                    await this.connection(store_name)
                ).getRepository(Advertisers);

                const result =
                    await this.extractCSVFileData(advertiserReportData);

                if (result['status'] === 200) {
                    const csvData = result['data'];

                    const dataResult = await Promise.all(
                        csvData.map(async (data) => {
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
                                conversion_rate:
                                    data['Conversion Rate (Units Sold Based)'],
                                orders: data['Orders'],
                                conversion_rate_order_based:
                                    data['Conversion Rate (Orders Based)'],
                                total_attributed_sales:
                                    data['Total Attributed Sales'],
                                advertised_sku_sales:
                                    data['Advertised SKU Sales'],
                                other_sku_sales: data['Other SKU Sales'],
                                units_sold: data['Units Sold'],
                                advertise_sku_units:
                                    data['Advertised SKU Units (#)'],
                                other_sku_units: data['Other SKU Units (#)'],
                                roas: data['RoAS'],
                                store_id: advertiserReportData.store_id,
                                advertiser_report_id: advertiserReportData.id,
                            };

                            const checkAdvData =
                                await advertiserRepository.findOne({
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
                        }),
                    );
                    await advertiserReportRepository.update(
                        { id: advertiserReportData.id },
                        { status: 'complete' },
                    );

                    logger.info(
                        `Here is the all records, ${dataResult.length}`,
                    );
                    await advertiserRepository.save(dataResult, { chunk: 200 });
                } else if (result['status'] === 500) {
                    await advertiserReportRepository.update(
                        { id: advertiserReportData.id },
                        { status: 'failed' },
                    );
                }
                // (await this.connection(store_name)).destroy();
            }
            // (await this.publicConnection()).destroy();
        } catch (error) {
            scrapperLogger.info('error', error);
            return [error];
        }
        return getStore;
    }

    @Get('/generate-campaign-report')
    generateCampaignReport() {
        this.indexNumber = 5;
        this.index();
        return {};
    }

    @Get('/get-campaign-table-records')
    async getCampaignTableRecords() {
        this.reportType = 'Campaign Snapshot';
        this.indexNumber = 5;
        this.getTableRecords();

        return {};
    }

    @Get('/download-campaign-files')
    async downloadFile() {
        const publicConnection = await this.publicConnection();
        const storeRepository = publicConnection.getRepository(StoreConfig);
        const getStore = await storeRepository
            .createQueryBuilder('store_config')
            .select('store_config.*, adv.*')
            .leftJoin(
                'advertiser_reports',
                'adv',
                'store_config.id = adv.store_id',
            )
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
                await advertiserQueue.add(
                    'downloadItemPerformance',
                    jobDataForDownload,
                );
                const advertiserReportRepository =
                    publicConnection.getRepository(AdvertiserReports);

                await advertiserReportRepository.update(
                    { id: advertiserReportData.id },
                    { status: 'downloaded' },
                );
            }
        } catch (error) {
            return [error];
        }
        return {};
    }

    @Get('/extract-campaign-zip')
    async extractCampaignZip() {
        const publicConnection = await this.publicConnection();
        const advertiserReportRepository =
            publicConnection.getRepository(AdvertiserReports);
        const storeRepository = publicConnection.getRepository(StoreConfig);

        const getStore = await storeRepository
            .createQueryBuilder('store_config')
            .select('store_config.*, adv.*')
            .leftJoin(
                'advertiser_reports',
                'adv',
                'store_config.id = adv.store_id',
            )
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
            const fileName = path.join(
                __dirname,
                `../../dist/${getStore[index].store_id}/${getStore[index].user_id}/${getStore[index].filename}.zip`,
            );
            const filePath = path.join(
                __dirname,
                `../../dist/${getStore[index].store_id}/${getStore[index].user_id}`,
            );
            const zip = new AdmZip(fileName);

            const extractedFile = zip.getEntries();
            const newName = `${getStore[index].filename}`;
            extractedFile[0].entryName = newName;
            zip.extractAllTo(filePath, true);
            fs.unlink(`${fileName}`, (err) => {
                logger.info(err);
            });
            await advertiserReportRepository.update(
                { id: getStore[index].id },
                { status: 'extracted' },
            );
        }
        return {};
    }

    @Get('/save-campaignJsonFileData')
    async saveCampaignJsonFileData() {
        const publicConnection = await this.publicConnection();
        const advertiserReportRepository =
            publicConnection.getRepository(AdvertiserReports);
        const storeRepository = publicConnection.getRepository(StoreConfig);
        const getStore = await storeRepository
            .createQueryBuilder('store_config')
            .select('store_config.*, adv.*')
            .leftJoin(
                'advertiser_reports',
                'adv',
                'store_config.id = adv.store_id',
            )
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
        getStore.map(async (campaignshot) => {
            // console.log(campaignshot);
            const fileName = path.join(
                __dirname,
                `../../dist/${campaignshot.store_id}/${campaignshot.user_id}/${campaignshot.filename}`,
            );
            const jsonData = await this.readJsonFile(fileName);
            const schema_name = `${campaignshot.store_name}`;
            const campaignSnapShotRepository = (
                await this.connection(schema_name)
            ).getRepository(CampaignSnapshot);
            await Promise.all(
                jsonData['campaigns'].map(async (campaign) => {
                    const checkCampaignExist =
                        await campaignSnapShotRepository.findOne({
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

                    await campaignSnapShotRepository.save(campaignData);

                    await advertiserReportRepository.update(
                        { id: campaignshot.id },
                        { status: 'complete' },
                    );
                }),
            );
            fs.unlink(`${fileName}`, (err) => {
                logger.info(err);
            });
        });
        return {};
    }
    async readJsonFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (parseError) {
                        reject(parseError);
                    }
                }
            });
        });
    }

    async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    @Get('/generate-item-report')
    generateItemReport() {
        this.indexNumber = 3;
        this.index();
        return {};
    }
}
