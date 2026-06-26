import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  BookingOverlapException,
  CapacityExceededException,
  DepartmentMismatchException,
  LocationNotBookableException,
} from "../../common/exceptions/domain.exceptions";
import { Location } from "../locations/entities/location.entity";
import { assertWithinOpenHours } from "./booking-time.util";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { QueryBookingDto } from "./dto/query-booking.dto";
import { Booking, BookingStatus } from "./entities/booking.entity";

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // (1) Location validity: exists and is bookable.
    const location = await this.locationRepo.findOne({
      where: { id: dto.locationId },
    });
    if (!location) {
      throw new NotFoundException(
        `Location with id "${dto.locationId}" not found.`,
      );
    }
    if (!location.isBookable) {
      throw new LocationNotBookableException(location.locationNumber);
    }

    // (2) Department matching.
    if (dto.department !== location.department) {
      throw new DepartmentMismatchException(
        dto.department,
        location.department,
      );
    }

    // (3) Capacity check.
    if (location.capacity === null || dto.attendees > location.capacity) {
      throw new CapacityExceededException(dto.attendees, location.capacity);
    }

    // (4) Time validation (day-of-week, open-hours window, end > start).
    assertWithinOpenHours(location.openTime, startTime, endTime);

    // (5) Overlap check against existing CONFIRMED bookings (design addition).
    await this.assertNoOverlap(location.id, startTime, endTime);

    const booking = this.bookingRepo.create({
      locationId: location.id,
      department: dto.department,
      attendees: dto.attendees,
      startTime,
      endTime,
      status: BookingStatus.CONFIRMED,
      rejectionReason: null,
    });
    return this.bookingRepo.save(booking);
  }

  private async assertNoOverlap(
    locationId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    // Two intervals overlap iff existing.start < new.end AND existing.end > new.start.
    const overlap = await this.bookingRepo
      .createQueryBuilder("b")
      .where("b.locationId = :locationId", { locationId })
      .andWhere("b.status = :status", { status: BookingStatus.CONFIRMED })
      .andWhere("b.startTime < :endTime", { endTime })
      .andWhere("b.endTime > :startTime", { startTime })
      .getOne();

    if (overlap) {
      throw new BookingOverlapException(
        `The requested slot overlaps confirmed booking ${overlap.id} (${overlap.startTime.toISOString()} – ${overlap.endTime.toISOString()}).`,
      );
    }
  }

  async findAll(query: QueryBookingDto): Promise<Booking[]> {
    const qb = this.bookingRepo
      .createQueryBuilder("b")
      .orderBy("b.startTime", "ASC");

    if (query.locationId) {
      qb.andWhere("b.locationId = :locationId", {
        locationId: query.locationId,
      });
    }
    if (query.department) {
      qb.andWhere("b.department = :department", {
        department: query.department,
      });
    }
    if (query.from) {
      qb.andWhere("b.startTime >= :from", { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere("b.startTime <= :to", { to: new Date(query.to) });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with id "${id}" not found.`);
    }
    return booking;
  }

  /** Cancel a booking (idempotent: cancelling a cancelled booking is a no-op). */
  async cancel(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status !== BookingStatus.CANCELLED) {
      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepo.save(booking);
    }
    return booking;
  }
}
