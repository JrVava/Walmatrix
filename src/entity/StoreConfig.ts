import {
    Column,
    Entity,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UsersSettings } from './Index';

@Entity()
export class StoreConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number | null;

    @Column()
    store_name: string | null;

    @Column()
    is_active: boolean;

    @Column({ default: false })
    is_deleted: boolean;

    @OneToOne(() => UsersSettings, (userSetting) => userSetting.stores)
    userSetting: UsersSettings;

    @Column()
    name: string | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
