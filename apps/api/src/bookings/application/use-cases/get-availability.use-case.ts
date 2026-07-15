import { Inject } from '@nestjs/common';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
  OccupiedSlot,
} from '../../domain/ports/booking.repository';

export interface GetAvailabilityCommand {
  salaId: string;
  desde: Date;
  hasta: Date;
}

export class GetAvailabilityUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(command: GetAvailabilityCommand): Promise<OccupiedSlot[]> {
    return this.bookingRepo.findOccupiedSlots(
      command.salaId,
      command.desde,
      command.hasta,
    );
  }
}
