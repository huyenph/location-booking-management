import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { QueryBookingDto } from "./dto/query-booking.dto";
import { Booking } from "./entities/booking.entity";

@ApiTags("bookings")
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary:
      "Create a booking. Runs location/department/capacity/time/overlap validation.",
  })
  @ApiCreatedResponse({ type: Booking })
  create(@Body() dto: CreateBookingDto): Promise<Booking> {
    return this.bookingsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      "List bookings, filterable by locationId, department, and date range.",
  })
  @ApiOkResponse({ type: Booking, isArray: true })
  findAll(@Query() query: QueryBookingDto): Promise<Booking[]> {
    return this.bookingsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single booking." })
  @ApiOkResponse({ type: Booking })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Booking> {
    return this.bookingsService.findOne(id);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel a booking." })
  @ApiOkResponse({ type: Booking })
  cancel(@Param("id", ParseUUIDPipe) id: string): Promise<Booking> {
    return this.bookingsService.cancel(id);
  }
}
