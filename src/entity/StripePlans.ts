import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class StripePlans {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    plan_name: string;

    @Column()
    amount: number;

    @Column()
    interval: string;

    @Column()
    stripe_price_id: string;

    @Column('text', { nullable: true })
    description: string;

    @Column({ nullable: true })
    no_of_orders: number;

    @Column({ nullable: true })
    no_of_users: number;

    @Column({ nullable: true })
    no_of_stores: number;

    @Column({ default: false })
    real_time_track: boolean;

    @Column({ default: false })
    sales_trend: boolean;

    @Column({ default: false })
    download_reports: boolean;

    @Column({ default: false })
    is_delete: boolean;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
