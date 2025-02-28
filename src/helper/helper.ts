import { StoreConfig } from '../entity/Index';
import { DataSourceConnection } from '../connection';

export async function findSchemaNameWithArray(store_id: []) {
    const connection = new DataSourceConnection();
    const storeRepository = (await connection.publicConnection()).getRepository(
        StoreConfig,
    );

    const getStoreData = await storeRepository
        .createQueryBuilder('store')
        .select('store.user_id', 'user_id')
        .addSelect('id', 'id')
        .where('store.id IN (:...store_id)', { store_id: store_id })
        .andWhere('store.is_active = :is_active', { is_active: true })
        .andWhere('store.is_deleted != :is_deleted', { is_deleted: true })
        .getRawOne();
    (await connection.publicConnection()).destroy();
    return { schemaName: `default_${getStoreData.user_id}` };
}
