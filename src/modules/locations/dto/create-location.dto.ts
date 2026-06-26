import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { OpenTimeDto } from "./open-time.dto";

export class CreateLocationDto {
  @ApiProperty({ example: "A" })
  @IsString()
  @IsNotEmpty()
  building: string;

  @ApiProperty({ example: "Meeting Room 1" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "A-01-01",
    description: "Unique human-readable code.",
  })
  @IsString()
  @IsNotEmpty()
  locationNumber: string;

  @ApiPropertyOptional({
    format: "uuid",
    description: "Parent node id. Omit/null only for a top-level Building.",
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    example: "EFM",
    description: "Only for bookable rooms.",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  department?: string;

  @ApiPropertyOptional({ example: 8, description: "Only for bookable rooms." })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @ApiPropertyOptional({
    type: OpenTimeDto,
    description: "Only for bookable rooms.",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenTimeDto)
  openTime?: OpenTimeDto;

  @ApiPropertyOptional({
    default: false,
    description: "Mark true only for leaf rooms that can be booked.",
  })
  @IsOptional()
  @IsBoolean()
  isBookable?: boolean;
}
