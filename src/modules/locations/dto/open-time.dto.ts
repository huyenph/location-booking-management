import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsEnum, Matches } from "class-validator";
import { DayOfWeek } from "../entities/open-time.interface";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OpenTimeDto {
  @ApiProperty({
    enum: DayOfWeek,
    isArray: true,
    example: ["MON", "TUE", "WED", "THU", "FRI"],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(DayOfWeek, { each: true })
  days: DayOfWeek[];

  @ApiProperty({ example: "09:00", description: '24h "HH:mm" (UTC+0).' })
  @Matches(HHMM, { message: "startTime must be in HH:mm 24h format" })
  startTime: string;

  @ApiProperty({ example: "18:00", description: '24h "HH:mm" (UTC+0).' })
  @Matches(HHMM, { message: "endTime must be in HH:mm 24h format" })
  endTime: string;
}
