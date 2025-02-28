import { Get, JsonController } from 'routing-controllers';
import { wallmartQueues } from '../service/walmartQueue';
import { DataSourceConnection } from '../connection';
import { ReconManagement, UsersSettings } from '../entity/Index';

@JsonController('/wallmart')
export class WalmartController extends DataSourceConnection {
    @Get('/get-recon-available-dates')
    async getReconAvailaleDates() {
        const getUserDetails = await this.getUserDetails();
        if (getUserDetails.length > 0) {
            for (const setting of getUserDetails) {
                const data = {
                    user_setting_id: setting.user_setting_id,
                    user_id: setting.user_id,
                    store_name: setting.store_name,
                    store_id: setting.store_id,
                    client_id: setting.client_id,
                    client_secret: setting.client_secret,
                };
                await wallmartQueues.add('get-recon-dates', data);
            }
        }
        return {};
    }

    @Get('/read-recon-report')
    async readReconReport() {
        const publicConnection = await this.publicConnection();
        const reconManageRepository =
            publicConnection.getRepository(ReconManagement);

        const getAllUnreadFiles = await reconManageRepository
            .createQueryBuilder('recon_manage')
            .leftJoinAndSelect('recon_manage.userSetting', 'setting')
            .where('recon_manage.is_file_read =:is_file_read', {
                is_file_read: false,
            })
            .andWhere('recon_manage.is_deleted = :is_deleted', {
                is_deleted: false,
            })
            .andWhere('recon_manage.is_file_downloaded = :is_file_downloaded', {
                is_file_downloaded: true,
            })
            .andWhere('setting.is_connected = :is_connected', {
                is_connected: true,
            })
            .getMany();

        for (const unReadFiles of getAllUnreadFiles) {
            const s3FilePath = `${unReadFiles.userSetting.store_id}/${unReadFiles.userSetting.user_id}/recon/file_${unReadFiles.available_date}-${unReadFiles.userSetting.store_id}.zip`;

            const jobData = {
                user_id: unReadFiles.userSetting.user_id,
                file_path: s3FilePath,
                store_id: unReadFiles.userSetting.store_id,
                file_id: unReadFiles.id,
                available_date: unReadFiles.available_date,
            };
            await wallmartQueues.add('read-recon-file-csv', jobData);
        }
        return {};
    }

    async getUserDetails() {
        const publicConnection = await this.publicConnection();
        const usersSettingRepository =
            publicConnection.getRepository(UsersSettings);
        const getCredentials = await usersSettingRepository
            .createQueryBuilder('us')
            .select('us.client_id', 'client_id')
            .addSelect('us.client_secret', 'client_secret')
            .addSelect('sc.store_name', 'store_name')
            .addSelect('sc.id', 'store_id')
            .addSelect('sc.user_id', 'user_id')
            .addSelect('us.id', 'user_setting_id')
            .addSelect('us.recon_date', 'recon_date')
            .leftJoin('store_config', 'sc', 'us.store_id = sc.id')
            .where('us.is_connected = :is_connected', { is_connected: true })
            .andWhere('sc.is_deleted = :is_deleted', { is_deleted: false })
            // .andWhere('us.user_id in (:...user_id)', { user_id: [11] })
            // .andWhere('us.id in (:...id)', { id: [1] })
            .getRawMany();
        await publicConnection.destroy();
        return getCredentials;
    }
}
