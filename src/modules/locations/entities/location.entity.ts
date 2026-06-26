import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
  UpdateDateColumn,
} from "typeorm";
import { OpenTime } from "./open-time.interface";

@Entity("locations")
@Tree("closure-table")
export class Location {
  @ApiProperty({ format: "uuid" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ example: "A", description: "Building identifier." })
  @Column({ type: "varchar", length: 100 })
  building: string;

  @ApiProperty({ example: "Meeting Room 1" })
  @Column({ type: "varchar", length: 255 })
  name: string;

  @ApiProperty({
    example: "A-01-01",
    description:
      "Human-readable code matching the dash-separated hierarchy. Unique.",
  })
  @Index("UQ_location_location_number", { unique: true })
  @Column({
    type: "varchar",
    name: "location_number",
    length: 100,
    unique: true,
  })
  locationNumber: string;

  @ApiPropertyOptional({
    example: "EFM",
    description: "Owning department; only set on bookable rooms.",
    nullable: true,
  })
  @Column({ type: "varchar", length: 100, nullable: true })
  department: string | null;

  @ApiPropertyOptional({
    example: 8,
    description: "Maximum number of attendees; only set on bookable rooms.",
    nullable: true,
  })
  @Column({ type: "int", nullable: true })
  capacity: number | null;

  @ApiPropertyOptional({
    description: "Structured opening hours; only set on bookable rooms.",
    nullable: true,
    example: {
      days: ["MON", "TUE", "WED", "THU", "FRI"],
      startTime: "09:00",
      endTime: "18:00",
    },
  })
  @Column({ type: "jsonb", name: "open_time", nullable: true })
  openTime: OpenTime | null;

  @ApiProperty({
    description: "True only for leaf rooms that can actually be booked.",
    default: false,
  })
  @Column({ type: "boolean", name: "is_bookable", default: false })
  isBookable: boolean;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @Column({ type: "uuid", name: "parent_id", nullable: true })
  parentId: string | null;

  @TreeParent({ onDelete: "RESTRICT" })
  parent: Location | null;

  @TreeChildren()
  children: Location[];

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
