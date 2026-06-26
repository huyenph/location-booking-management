import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Location } from "../../locations/entities/location.entity";

export enum BookingStatus {
  CONFIRMED = "CONFIRMED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

@Entity("bookings")
@Index("IDX_booking_location_time", ["locationId", "startTime", "endTime"])
export class Booking {
  @ApiProperty({ format: "uuid" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ format: "uuid", description: "The room being booked." })
  @Column({ type: "uuid", name: "location_id" })
  locationId: string;

  @ManyToOne(() => Location, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @ApiProperty({ example: "EFM", description: "Requesting department/entity." })
  @Column({ type: "varchar", length: 100 })
  department: string;

  @ApiProperty({ example: 4, description: "Number of people attending." })
  @Column({ type: "int" })
  attendees: number;

  @ApiProperty({ description: "Booking start (stored as UTC timestamptz)." })
  @Column({ type: "timestamptz", name: "start_time" })
  startTime: Date;

  @ApiProperty({ description: "Booking end (stored as UTC timestamptz)." })
  @Column({ type: "timestamptz", name: "end_time" })
  endTime: Date;

  @ApiProperty({ enum: BookingStatus, default: BookingStatus.CONFIRMED })
  @Column({
    type: "enum",
    enum: BookingStatus,
    default: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @ApiPropertyOptional({
    nullable: true,
    description: "Populated when a booking is rejected, for audit purposes.",
  })
  @Column({
    type: "varchar",
    length: 500,
    name: "rejection_reason",
    nullable: true,
  })
  rejectionReason: string | null;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
