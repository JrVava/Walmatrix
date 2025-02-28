import puppeteer from 'puppeteer';
import { Get, JsonController } from 'routing-controllers';
import { DataSourceConnection } from '../connection';
// import { Advertiser } from '../entity/Advertiser';
import { AdvertiserReports, UsersSettings } from '../entity/Index';

@JsonController('/old-scapper')
export class Scrapper {
    async signIn(page) {
        const elements = await page.$$('.panel-button');
        let i = 0;
        elements.forEach(async (element) => {
            if (i == 1) {
                await element.click();
            }
            i = i + 1;
        });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.type('input[type=text]', 'ppc@sellcord.co');
        await page.type('input[type=password]', 'PPC@sellcord21');
        const elements2 = await page.$$('.app-btn');
        elements2.forEach(async (element) => {
            await element.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    @Get('/')
    async index() {
        try {
            const getUserConfigs = await this.getUserConfig();

            for (let index = 0; index < getUserConfigs.length; index++) {
                const config = getUserConfigs[index];
                const advertiserId = config.advertiser_id;

                const browser = await puppeteer.launch({ headless: false });
                const page = await browser.newPage();

                await page.setViewport({ width: 1300, height: 740 });
                await page.goto('https://advertising.walmart.com/signin', {
                    waitUntil: 'networkidle2',
                });

                await this.signIn(page);

                await page.goto(
                    `https://advertising.walmart.com/view/report/advertiser/${advertiserId}/ondemand`,
                    { waitUntil: 'networkidle2' },
                );

                const buttonElement = await page.$$('button');
                for (const element of buttonElement) {
                    const value = await element.evaluate(
                        (el) => el.textContent,
                    );

                    if (value == 'Request Report') {
                        await element.click();
                        break; // Exit the loop after the first button click
                    }
                }

                await this.generateReport(page);
                // Rest of the scraping logic

                await browser.close();
            }

            return {};
        } catch (e) {
            return;
        }
    }

    async generateReport(page) {
        // Report Type Click and select second option code start below
        const reportTypeDropdown = '.select-wmlt';
        await page.waitForSelector(reportTypeDropdown);
        const reportTypeElement = await page.$$(reportTypeDropdown);

        //get options for 1 select report type
        reportTypeElement[0].click();
        const reportTypeoptionSelector = '.select-wmlt__menu-list';
        await page.waitForSelector(reportTypeoptionSelector);
        const getMenu = await page.$$('.select-wmlt__option');
        await getMenu[2].click();
        //Start for attribution window
        await page.waitForSelector(reportTypeDropdown);
        const attrTypeElement = await page.$$(reportTypeDropdown);
        await attrTypeElement[1].click(); //click on select option
        await page.waitForSelector(reportTypeoptionSelector);
        const getAttrMenu = await page.$$('.select-wmlt__option');
        await getAttrMenu[0].click(); //0 = 3 days,1=14 days,2=30 days
        //start for Grroup by
        await page.waitForSelector(reportTypeDropdown);
        const groupByElement = await page.$$(reportTypeDropdown);
        await groupByElement[2].click(); //click on select option
        await page.waitForSelector(reportTypeoptionSelector);
        const getGroupMenu = await page.$$('.select-wmlt__option');
        await getGroupMenu[0].click(); //0=cumulative,1=daily

        await page.waitForSelector('.date-range-clickable');
        const dateRangeElement = await page.$('.date-range-clickable');
        await dateRangeElement.click();

        await page.waitForSelector('.ranges');
        await page.$eval(
            'input[name=daterangepicker_start]',
            (element, value) => {
                element.value = value;
            },
            '06/04/2022',
        );

        await page.$eval(
            'input[name=daterangepicker_end]',
            (element, value) => {
                element.value = value;
            },
            '07/04/2022',
        );
        await page.waitForSelector('.range_inputs');
        //   const applyBtn = await page.$('.applyBt');
        //   await applyBtn.click()
        // Get button for submit popup form

        const buttonSelector =
            'button[data-automation-id="request-ondemand-report-button"]';
        await page.waitForSelector(buttonSelector);
        const popUpButtonElement = await page.$(buttonSelector);
        // Click the button
        await popUpButtonElement.click();

        // const getOkayButton = await page.$$('.sc-bczRLJ');
        // console.log(getOkayButton);
        // getOkayButton[0].click();
        const getOkayButton =
            'button[data-automation-id="button-confirm-request"]';
        await page.waitForSelector(getOkayButton);
        const okayButtonElement = await page.$(getOkayButton);
        await okayButtonElement.click();

        await page.$$('table');

        // console.log('🚀 ~ Scrapper ~ index ~ getTable:', getTable);
    }

    @Get('/download-report')
    async downloadGeneratedReports() {
        try {
            const getUserConfig = await this.getUserConfig();
            const connection = new DataSourceConnection();
            const advertiserRepository = (
                await connection.publicConnection()
            ).getRepository(AdvertiserReports);
            for (let index = 0; index < getUserConfig.length; index++) {
                const advertiser_id = getUserConfig[index].advertiser_id;
                const store_id = getUserConfig[index].store_id;

                const browser = await puppeteer.launch({ headless: false });
                const page = await browser.newPage();

                await page.setViewport({ width: 1300, height: 740 });
                await page.goto('https://advertising.walmart.com/signin', {
                    waitUntil: 'networkidle2',
                });

                await this.signIn(page);

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

                for (
                    let hrefIndex = 0;
                    hrefIndex < hrefValues.length;
                    hrefIndex++
                ) {
                    const url = hrefValues[hrefIndex];
                    const removeParameters = url.split('?')[1];
                    const uid = url.split('/')[4];

                    const updatedUID = uid.replace(`?${removeParameters}`, ''); // UID
                    const fileName = url.split('?fileName=')[1]; // File name

                    const advertiser: Partial<AdvertiserReports> = {
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
                    const saveAdvertiser =
                        advertiserRepository.create(advertiser);
                    await advertiserRepository.save(saveAdvertiser);
                }
            }
        } catch (error) {
            return error;
        }
        // return hrefValues;
    }

    async getUserConfig() {
        const connection = new DataSourceConnection();
        const usersSettingRepository = (
            await connection.publicConnection()
        ).getRepository(UsersSettings);

        const userSettings = await usersSettingRepository
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
            for (
                let advertiserIndex = 0;
                advertiserIndex < advertisersArray.length;
                advertiserIndex++
            ) {
                advertiserArray.push({
                    advertiser_id: advertisersArray[advertiserIndex],
                    store_id: userSettings[index].store_id,
                });
            }
        }
        return advertiserArray;
    }
}
