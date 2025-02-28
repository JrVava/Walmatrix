import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class AdsReportManagement {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    advertise_id: number | null;

    @Column({ nullable: true })
    snapshot_id: string | null;

    @Column({ nullable: true })
    user_setting_id: number | null;

    @Column({ default: '' })
    job_status: string | null;

    @Column({ default: '' })
    start_date: string | null;

    @Column({ default: '' })
    end_date: string | null;

    @Column({ default: '' })
    report_link: string | null;

    @Column({ default: false })
    is_deleted: boolean;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;

    @Column({ default: '' })
    report_type: string | null;
}
