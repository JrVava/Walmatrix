import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
@Entity()
export class CampaignSnapshot {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    name: string | null;

    @Column({ nullable: true })
    campaign_type: string | null;

    @Column({ nullable: true })
    targeting_type: string | null;

    @Column({ nullable: true })
    status: string | null;

    @Column({ nullable: true })
    budget_type: string | null;

    @Column({ nullable: true })
    start_date: string | null;

    @Column({ nullable: true })
    end_date: string | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    total_budget: number | null;

    @Column({
        nullable: true,
        transformer: {
            to: (value) => parseFloat(value),
            from: (value) => value,
        },
    })
    daily_budget: number | null;

    @Column({ nullable: true })
    rollover: boolean | null;

    @Column({ nullable: true })
    advertiser_id: number | null;

    @Column({ nullable: true })
    campaign_id: number | null;

    @Column({ nullable: true })
    channel: string | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @Column({ nullable: true })
    store_id: number | null;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
