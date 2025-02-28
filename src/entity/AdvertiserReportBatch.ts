import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class AdvertiserReportBatch {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    start_date: string | null;

    @Column({ default: '' })
    end_date: string | null;

    @Column({ nullable: true })
    advertiser_id: number | null;

    @Column({ nullable: true })
    advertiser_management_id: number | null;

    @Column({ default: false })
    report_status: boolean;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
