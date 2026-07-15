import { Inject } from '@nestjs/common';
import { Booking } from '../../domain/entities/booking.entity';
import { BOOKING_REPOSITORY, IBookingRepository } from '../../domain/ports/booking.repository';

export class GetAllBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(): Promise<Booking[]> {
    return this.bookingRepo.findAll();
  }
}
