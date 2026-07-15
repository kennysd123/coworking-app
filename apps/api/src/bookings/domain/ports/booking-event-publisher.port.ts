import type { BookingCreatedEvent } from '../events/booking-created.event';
import type { BookingCancelledEvent } from '../events/booking-cancelled.event';

export interface IBookingEventPublisher {
  publishBookingCreated(event: BookingCreatedEvent): void;
  publishBookingCancelled(event: BookingCancelledEvent): void;
}

export const BOOKING_EVENT_PUBLISHER = Symbol('IBookingEventPublisher');
