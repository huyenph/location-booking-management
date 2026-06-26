import { ApiProperty } from "@nestjs/swagger";
import {
  IsInt,
  IsNotEmpty,
  IsISO8601,
  IsPositive,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateBookingDto {
  @ApiProperty({ format: "uuid", description: "The bookable room id." })
  @IsUUID()
  locationId: string;

  @ApiProperty({ example: "EFM", description: "Requesting department." })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @IsPositive()
  attendees: number;

  @ApiProperty({
    example: "2026-07-01T09:00:00Z",
    description: "Booking start, ISO-8601. Interpreted as UTC.",
  })
  @IsISO8601()
  startTime: string;

  @ApiProperty({
    example: "2026-07-01T10:00:00Z",
    description: "Booking end, ISO-8601. Interpreted as UTC.",
  })
  @IsISO8601()
  endTime: string;
}
