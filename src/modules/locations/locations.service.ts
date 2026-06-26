import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, TreeRepository } from "typeorm";
import { Booking, BookingStatus } from "../bookings/entities/booking.entity";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { Location } from "./entities/location.entity";

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: TreeRepository<Location>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const existing = await this.locationRepo.findOne({
      where: { locationNumber: dto.locationNumber },
    });
    if (existing) {
      throw new ConflictException(
        `A location with locationNumber "${dto.locationNumber}" already exists.`,
      );
    }

    let parent: Location | null = null;
    if (dto.parentId) {
      parent = await this.locationRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(
          `Parent location with id "${dto.parentId}" not found.`,
        );
      }
    }

    const location = this.locationRepo.create({
      building: dto.building,
      name: dto.name,
      locationNumber: dto.locationNumber,
      department: dto.department ?? null,
      capacity: dto.capacity ?? null,
      openTime: dto.openTime ?? null,
      isBookable: dto.isBookable ?? false,
      parent: parent ?? null,
      parentId: parent?.id ?? null,
    });

    return this.locationRepo.save(location);
  }

  /** Full location forest as nested JSON (one tree per root Building). */
  async findTree(): Promise<Location[]> {
    return this.locationRepo.findTrees();
  }

  /** Flat lookup of a single node. */
  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with id "${id}" not found.`);
    }
    return location;
  }

  /** Single node together with its full descendant subtree. */
  async findOneWithSubtree(id: string): Promise<Location> {
    const location = await this.findOne(id);
    return this.locationRepo.findDescendantsTree(location);
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);

    if (dto.locationNumber && dto.locationNumber !== location.locationNumber) {
      const clash = await this.locationRepo.findOne({
        where: { locationNumber: dto.locationNumber },
      });
      if (clash) {
        throw new ConflictException(
          `A location with locationNumber "${dto.locationNumber}" already exists.`,
        );
      }
    }

    Object.assign(location, {
      ...dto,
      // Preserve explicit null clearing when keys are provided.
      department:
        dto.department === undefined ? location.department : dto.department,
      capacity: dto.capacity === undefined ? location.capacity : dto.capacity,
      openTime: dto.openTime === undefined ? location.openTime : dto.openTime,
    });

    return this.locationRepo.save(location);
  }

  /**
   * Delete a node. Blocked (409) if it has children OR any non-cancelled
   * bookings, so we never orphan a subtree or destroy booking history.
   */
  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);

    const childCount = await this.locationRepo.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete location "${location.locationNumber}": it has ${childCount} child node(s). Delete or move them first.`,
      );
    }

    const activeBookings = await this.bookingRepo.count({
      where: { locationId: id, status: BookingStatus.CONFIRMED },
    });
    if (activeBookings > 0) {
      throw new ConflictException(
        `Cannot delete location "${location.locationNumber}": it has ${activeBookings} active booking(s).`,
      );
    }

    await this.locationRepo.remove(location);
  }
}
