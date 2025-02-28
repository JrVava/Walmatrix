import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Cogs {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    product_id: number;

    @Column({ nullable: true })
    amount: number | null;

    @Column('date', { nullable: true })
    start: string | null;

    @Column('date', { nullable: true })
    end: string | null;

    @Column({ default: () => 'CURRENT_TIMESTAMP' })
    created_at: string;

    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated_at: string;
}
