import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class QueryBookingDto {
  @ApiPropertyOptional({ format: "uuid", description: "Filter by location." })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: "Filter by requesting department." })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description:
      "Range start (inclusive), ISO-8601 UTC. Matches bookings with startTime >= from.",
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description:
      "Range end (inclusive), ISO-8601 UTC. Matches bookings with startTime <= to.",
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
