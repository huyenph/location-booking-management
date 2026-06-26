import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Location } from "../locations/entities/location.entity";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { Booking } from "./entities/booking.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Location])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
