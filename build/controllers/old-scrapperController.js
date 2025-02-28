"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
// import { Advertiser } from '../entity/Advertiser';
const Index_1 = require("../entity/Index");
let Scrapper = class Scrapper {
    signIn(page) {
        return __awaiter(this, void 0, void 0, function* () {
            const elements = yield page.$$('.panel-button');
            let i = 0;
            elements.forEach((element) => __awaiter(this, void 0, void 0, function* () {
                if (i == 1) {
                    yield element.click();
                }
                i = i + 1;
            }));
            yield page.waitForNavigation({ waitUntil: 'networkidle2' });
            yield page.type('input[type=text]', 'ppc@sellcord.co');
            yield page.type('input[type=password]', 'PPC@sellcord21');
            const elements2 = yield page.$$('.app-btn');
            elements2.forEach((element) => __awaiter(this, void 0, void 0, function* () {
                yield element.click();
            }));
            yield page.waitForNavigation({ waitUntil: 'networkidle2' });
        });
    }
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const getUserConfigs = yield this.getUserConfig();
                for (let index = 0; index < getUserConfigs.length; index++) {
                    const config = getUserConfigs[index];
                    const advertiserId = config.advertiser_id;
                    const browser = yield puppeteer_1.default.launch({ headless: false });
                    const page = yield browser.newPage();
                    yield page.setViewport({ width: 1300, height: 740 });
                    yield page.goto('https://advertising.walmart.com/signin', {
                        waitUntil: 'networkidle2',
                    });
                    yield this.signIn(page);
                    yield page.goto(`https://advertising.walmart.com/view/report/advertiser/${advertiserId}/ondemand`, { waitUntil: 'networkidle2' });
                    const buttonElement = yield page.$$('button');
                    for (const element of buttonElement) {
                        const value = yield element.evaluate((el) => el.textContent);
                        if (value == 'Request Report') {
                            yield element.click();
                            break; // Exit the loop after the first button click
                        }
                    }
                    yield this.generateReport(page);
                    // Rest of the scraping logic
                    yield browser.close();
                }
                return {};
            }
            catch (e) {
                return;
            }
        });
    }
    generateReport(page) {
        return __awaiter(this, void 0, void 0, function* () {
            // Report Type Click and select second option code start below
            const reportTypeDropdown = '.select-wmlt';
            yield page.waitForSelector(reportTypeDropdown);
            const reportTypeElement = yield page.$$(reportTypeDropdown);
            //get options for 1 select report type
            reportTypeElement[0].click();
            const reportTypeoptionSelector = '.select-wmlt__menu-list';
            yield page.waitForSelector(reportTypeoptionSelector);
            const getMenu = yield page.$$('.select-wmlt__option');
            yield getMenu[2].click();
            //Start for attribution window
            yield page.waitForSelector(reportTypeDropdown);
            const attrTypeElement = yield page.$$(reportTypeDropdown);
            yield attrTypeElement[1].click(); //click on select option
            yield page.waitForSelector(reportTypeoptionSelector);
            const getAttrMenu = yield page.$$('.select-wmlt__option');
            yield getAttrMenu[0].click(); //0 = 3 days,1=14 days,2=30 days
            //start for Grroup by
            yield page.waitForSelector(reportTypeDropdown);
            const groupByElement = yield page.$$(reportTypeDropdown);
            yield groupByElement[2].click(); //click on select option
            yield page.waitForSelector(reportTypeoptionSelector);
            const getGroupMenu = yield page.$$('.select-wmlt__option');
            yield getGroupMenu[0].click(); //0=cumulative,1=daily
            yield page.waitForSelector('.date-range-clickable');
            const dateRangeElement = yield page.$('.date-range-clickable');
            yield dateRangeElement.click();
            yield page.waitForSelector('.ranges');
            yield page.$eval('input[name=daterangepicker_start]', (element, value) => {
                element.value = value;
            }, '06/04/2022');
            yield page.$eval('input[name=daterangepicker_end]', (element, value) => {
                element.value = value;
            }, '07/04/2022');
            yield page.waitForSelector('.range_inputs');
            //   const applyBtn = await page.$('.applyBt');
            //   await applyBtn.click()
            // Get button for submit popup form
            const buttonSelector = 'button[data-automation-id="request-ondemand-report-button"]';
            yield page.waitForSelector(buttonSelector);
            const popUpButtonElement = yield page.$(buttonSelector);
            // Click the button
            yield popUpButtonElement.click();
            // const getOkayButton = await page.$$('.sc-bczRLJ');
            // console.log(getOkayButton);
            // getOkayButton[0].click();
            const getOkayButton = 'button[data-automation-id="button-confirm-request"]';
            yield page.waitForSelector(getOkayButton);
            const okayButtonElement = yield page.$(getOkayButton);
            yield okayButtonElement.click();
            yield page.$$('table');
            // console.log('🚀 ~ Scrapper ~ index ~ getTable:', getTable);
        });
    }
    downloadGeneratedReports() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const getUserConfig = yield this.getUserConfig();
                const connection = new connection_1.DataSourceConnection();
                const advertiserRepository = (yield connection.publicConnection()).getRepository(Index_1.AdvertiserReports);
                for (let index = 0; index < getUserConfig.length; index++) {
                    const advertiser_id = getUserConfig[index].advertiser_id;
                    const store_id = getUserConfig[index].store_id;
                    const browser = yield puppeteer_1.default.launch({ headless: false });
                    const page = yield browser.newPage();
                    yield page.setViewport({ width: 1300, height: 740 });
                    yield page.goto('https://advertising.walmart.com/signin', {
                        waitUntil: 'networkidle2',
                    });
                    yield this.signIn(page);
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
                    // Extract the requested date on from the table
                    const requestedDate = yield page.$$eval('.react-bs-table tbody tr', (rows) => {
                        return rows.map((row) => {
                            const requestedDateCell = row.querySelector('td:nth-child(6)');
                            return requestedDateCell.textContent.trim();
                        });
                    });
                    for (let hrefIndex = 0; hrefIndex < hrefValues.length; hrefIndex++) {
                        const url = hrefValues[hrefIndex];
                        const removeParameters = url.split('?')[1];
                        const uid = url.split('/')[4];
                        const updatedUID = uid.replace(`?${removeParameters}`, ''); // UID
                        const fileName = url.split('?fileName=')[1]; // File name
                        const advertiser = {
                            uid: updatedUID,
                            filename: fileName,
                            url_code: advertiser_id,
                            report_name: reportNames[hrefIndex],
                            attribution_window: attributionWindows[hrefIndex],
                            group_by: groupBy[hrefIndex],
                            requested_data: requestedDate[hrefIndex],
                            status: 'pending',
                            csv_url: hrefValues[hrefIndex],
                            store_id: store_id,
                        };
                        const saveAdvertiser = advertiserRepository.create(advertiser);
                        yield advertiserRepository.save(saveAdvertiser);
                    }
                }
            }
            catch (error) {
                return error;
            }
            // return hrefValues;
        });
    }
    getUserConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = new connection_1.DataSourceConnection();
            const usersSettingRepository = (yield connection.publicConnection()).getRepository(Index_1.UsersSettings);
            const userSettings = yield usersSettingRepository
                .createQueryBuilder('userSettings')
                .select('userSettings.store_id', 'store_id')
                .addSelect('userSettings.id', 'userSettingID')
                .addSelect('userSettings.adversiter_id', 'adversiter_id')
                .where('userSettings.adversiter_id IS NOT NULL')
                .andWhere('userSettings.adversiter_id <> :adversiter_id', {
                adversiter_id: '[null]',
            })
                .getRawMany();
            const advertiserArray = [];
            for (let index = 0; index < userSettings.length; index++) {
                const advertisersArray = userSettings[index].adversiter_id;
                for (let advertiserIndex = 0; advertiserIndex < advertisersArray.length; advertiserIndex++) {
                    advertiserArray.push({
                        advertiser_id: advertisersArray[advertiserIndex],
                        store_id: userSettings[index].store_id,
                    });
                }
            }
            return advertiserArray;
        });
    }
};
__decorate([
    (0, routing_controllers_1.Get)('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "index", null);
__decorate([
    (0, routing_controllers_1.Get)('/download-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Scrapper.prototype, "downloadGeneratedReports", null);
Scrapper = __decorate([
    (0, routing_controllers_1.JsonController)('/old-scapper')
], Scrapper);
exports.Scrapper = Scrapper;
//# sourceMappingURL=old-scrapperController.js.map