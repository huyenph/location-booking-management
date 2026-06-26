import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  BookingOverlapException,
  CapacityExceededException,
  DepartmentMismatchException,
  LocationNotBookableException,
  OutsideOpenHoursException,
} from "../../common/exceptions/domain.exceptions";
import { Location } from "../locations/entities/location.entity";
import { DayOfWeek } from "../locations/entities/open-time.interface";
import { BookingsService } from "./bookings.service";
import { Booking, BookingStatus } from "./entities/booking.entity";

const bookableRoom = (overrides: Partial<Location> = {}): Location =>
  ({
    id: "loc-1",
    building: "A",
    name: "Meeting Room 1",
    locationNumber: "A-01-01",
    department: "EFM",
    capacity: 8,
    openTime: {
      days: [
        DayOfWeek.MON,
        DayOfWeek.TUE,
        DayOfWeek.WED,
        DayOfWeek.THU,
        DayOfWeek.FRI,
      ],
      startTime: "09:00",
      endTime: "18:00",
    },
    isBookable: true,
    parentId: "floor-1",
    parent: null,
    children: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Location;

// A valid Wednesday 09:00–10:00 UTC request.
const validDto = {
  locationId: "loc-1",
  department: "EFM",
  attendees: 4,
  startTime: "2026-07-01T09:00:00Z",
  endTime: "2026-07-01T10:00:00Z",
};

describe("BookingsService", () => {
  let service: BookingsService;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let locationRepo: jest.Mocked<Repository<Location>>;
  let overlapQb: { where: jest.Mock; andWhere: jest.Mock; getOne: jest.Mock };

  beforeEach(async () => {
    overlapQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            createQueryBuilder: jest.fn(() => overlapQb),
            create: jest.fn((x) => x),
            save: jest.fn((x) => Promise.resolve({ id: "booking-1", ...x })),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BookingsService);
    bookingRepo = module.get(getRepositoryToken(Booking));
    locationRepo = module.get(getRepositoryToken(Location));
  });

  it("creates a CONFIRMED booking for a fully valid request", async () => {
    locationRepo.findOne.mockResolvedValue(bookableRoom());

    const result = await service.create(validDto);

    expect(result.status).toBe(BookingStatus.CONFIRMED);
    expect(result.locationId).toBe("loc-1");
    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
  });

  it("throws NotFound when the location does not exist", async () => {
    locationRepo.findOne.mockResolvedValue(null);
    await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
  });

  it("rejects booking on a non-bookable (structural) node", async () => {
    locationRepo.findOne.mockResolvedValue(bookableRoom({ isBookable: false }));
    await expect(service.create(validDto)).rejects.toThrow(
      LocationNotBookableException,
    );
  });

  it("rejects on department mismatch", async () => {
    locationRepo.findOne.mockResolvedValue(bookableRoom({ department: "HR" }));
    await expect(service.create(validDto)).rejects.toThrow(
      DepartmentMismatchException,
    );
  });

  it("rejects when attendees exceed capacity", async () => {
    locationRepo.findOne.mockResolvedValue(bookableRoom({ capacity: 2 }));
    await expect(service.create(validDto)).rejects.toThrow(
      CapacityExceededException,
    );
  });

  it("rejects when outside the room open hours (Sunday)", async () => {
    locationRepo.findOne.mockResolvedValue(bookableRoom());
    await expect(
      service.create({
        ...validDto,
        startTime: "2026-07-05T09:00:00Z",
        endTime: "2026-07-05T10:00:00Z",
      }),
    ).rejects.toThrow(OutsideOpenHoursException);
  });

  it("rejects when the slot overlaps an existing confirmed booking", async () => {
    locationRepo.findOne.mockResolvedValue(bookableRoom());
    overlapQb.getOne.mockResolvedValue({
      id: "existing",
      startTime: new Date("2026-07-01T09:00:00Z"),
      endTime: new Date("2026-07-01T10:00:00Z"),
    });
    await expect(service.create(validDto)).rejects.toThrow(
      BookingOverlapException,
    );
  });

  it("enforces validation order: department checked before capacity", async () => {
    // Both department mismatch AND over capacity -> department error wins.
    locationRepo.findOne.mockResolvedValue(
      bookableRoom({ department: "HR", capacity: 1 }),
    );
    await expect(service.create(validDto)).rejects.toThrow(
      DepartmentMismatchException,
    );
  });
});
