import { Inject } from '@nestjs/common';
import { Booking } from '../../domain/entities/booking.entity';
import { BOOKING_REPOSITORY, IBookingRepository } from '../../domain/ports/booking.repository';

export class GetMyBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(userId: string): Promise<Booking[]> {
    return this.bookingRepo.findByUser(userId);
  }
}
