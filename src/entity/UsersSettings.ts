import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    OneToMany,
    UpdateDateColumn,
} from 'typeorm';
import {
    Users,
    AdvertiserManagement,
    StoreConfig,
    ReconManagement,
} from './Index';

@Entity()
export class UsersSettings {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    client_id: string | null;

    @Column({ nullable: true })
    client_secret: string | null;

    @Column({ nullable: true })
    access_token: string | null;

    @Column({ nullable: true })
    expire_at: string | null;

    @Column()
    @OneToOne(() => Users, (users) => users.id)
    @JoinColumn({ name: 'id' })
    user_id: number | null;

    // @Column('timestamp without time zone', { nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @OneToOne(() => Users, (user) => user.usersSettings)
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @Column({ default: false })
    is_connected: boolean;

    @Column({ default: false })
    scrapper_disable: boolean;

    @Column({ nullable: true })
    store_id: number;

    @Column('jsonb', { nullable: true })
    adversiter_id: number[] | null;

    @Column({ nullable: true })
    sync_date: string | null;

    @Column('date', { nullable: true })
    order_wfs_sync_date: string | null;

    @Column('date', { nullable: true })
    order_seller_sync_date: string | null;

    @Column('date', { nullable: true })
    order_plfulfilled_sync_date: string | null;

    @Column({ default: '' })
    recon_date: string | null;

    @Column({ default: '' })
    return_sync_date: string | null;

    @OneToMany(() => AdvertiserManagement, (advertise) => advertise.userSetting)
    advertise_id: AdvertiserManagement[];

    @OneToMany(() => ReconManagement, (recon) => recon.userSetting)
    recon_manage: ReconManagement[];

    @OneToOne(() => StoreConfig, (store) => store.userSetting)
    @JoinColumn({ name: 'store_id' })
    stores: StoreConfig;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
