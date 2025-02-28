import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class AdvertiserReports {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    uid: string | null;

    @Column({ default: '' })
    filename: string | null;

    @Column({ default: '' })
    url_code: string | null; // 249190

    @Column({ default: '' })
    report_name: string | null;

    @Column({ default: '' })
    attribution_window: string | null;

    @Column({ default: '' })
    group_by: string | null;

    @Column({ default: '' })
    requested_data: string | null;

    @Column('date', { default: '' })
    report_start_date: string | null;

    @Column('date', { default: '' })
    report_end_date: string | null;

    @Column({ default: '' })
    status: string | null;

    @Column({ default: '' })
    csv_url: string | null;

    @Column({ nullable: true })
    store_id: number | null;

    @Column({ nullable: true })
    downloaded_path: string | null;

    @Column({ nullable: true })
    s3_status: string | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
