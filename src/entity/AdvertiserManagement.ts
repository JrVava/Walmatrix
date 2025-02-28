import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UsersSettings } from './Index';
@Entity()
export class AdvertiserManagement {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    user_setting_id: number | null;

    @Column({ nullable: true })
    advertiser_id: number | null;

    @Column({ default: '' })
    sync_date: string | null;

    @Column({ nullable: true })
    is_verify: boolean;

    @Column({ default: false })
    is_deleted: boolean;

    @ManyToOne(() => UsersSettings, (userSetting) => userSetting.advertise_id)
    @JoinColumn({ name: 'user_setting_id' })
    userSetting: UsersSettings;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
