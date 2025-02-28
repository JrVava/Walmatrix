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
export class ReconManagement {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    available_date: string | null;

    @Column({ default: false })
    is_file_downloaded: boolean;

    @Column({ default: false })
    is_deleted: boolean;

    @Column({ nullable: true })
    user_setting_id: number | null;

    @Column({ nullable: false })
    is_file_read: boolean;

    @ManyToOne(() => UsersSettings, (userSetting) => userSetting.advertise_id)
    @JoinColumn({ name: 'user_setting_id' })
    userSetting: UsersSettings;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
