import { ConflictException, BadRequestException } from "@nestjs/common";

export class LocationNotBookableException extends BadRequestException {
  constructor(locationNumber: string) {
    super(
      `Location "${locationNumber}" is not bookable. Bookings can only be made on leaf rooms, not structural nodes (Building/Floor/Lobby/Corridor).`,
    );
  }
}

//  booking.department !== location.department
export class DepartmentMismatchException extends BadRequestException {
  constructor(bookingDept: string, locationDept: string | null) {
    super(
      `Department mismatch: this room belongs to "${locationDept ?? "N/A"}" but the booking was requested by "${bookingDept}".`,
    );
  }
}

//  booking.attendees > location.capacity
export class CapacityExceededException extends BadRequestException {
  constructor(attendees: number, capacity: number | null) {
    super(
      `Capacity exceeded: room capacity is ${capacity ?? 0} but ${attendees} attendees were requested.`,
    );
  }
}

//  Day-of-week / open-hours window violation, or end <= start.
export class OutsideOpenHoursException extends BadRequestException {
  constructor(reason: string) {
    super(`Outside open hours: ${reason}`);
  }
}

//  Requested slot overlaps an existing CONFIRMED booking.
export class BookingOverlapException extends ConflictException {
  constructor(
    message = "The requested time slot overlaps an existing confirmed booking for this room.",
  ) {
    super(message);
  }
}
