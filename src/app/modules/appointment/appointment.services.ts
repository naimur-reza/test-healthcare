import {
  Appointment,
  AppointmentStatus,
  NotificationRecipientType,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import prisma from '../../../shared/prisma';
import { IAuthUser, IGenericResponse } from '../../../interfaces/common';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IPaginationOptions } from '../../../interfaces/pagination';
import {
  appointmentRelationalFields,
  appointmentRelationalFieldsMapper,
  appointmentSearchableFields,
} from './appointment.constants';
import { generateTransactionId } from '../payment/payment.utils';
import {
  asyncForEach,
  formatDateTime,
  slugGenerator,
} from '../../../shared/utils';
import { Server } from 'socket.io';

const createAppointment = async (
  data: Partial<Appointment>,
  authUser: IAuthUser,
  io: Server,
) => {
  const { doctorId, scheduleId } = data;

  // Check if doctor exists
  const isDoctorExists = await prisma.doctor.findFirst({
    where: { id: doctorId },
  });

  if (!isDoctorExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Doctor doesn't exist!");
  }

  // Check if patient exists
  const isPatientExists = await prisma.patient.findFirst({
    where: { email: authUser?.email },
  });

  if (!isPatientExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Patient doesn't exist!");
  }

  // Check if doctor's schedule is available
  const isExistsDoctorSchedule = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId: doctorId,
      scheduleId: scheduleId,
      isBooked: false,
    },
  });

  if (!isExistsDoctorSchedule) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Doctor Schedule is not available!',
    );
  }

  const videoCallingId: string = uuidv4();

  return await prisma.$transaction(async transactionClient => {
    // Create appointment
    const result = await transactionClient.appointment.create({
      data: {
        patientId: isPatientExists.id,
        doctorId: isDoctorExists.id,
        scheduleId: isExistsDoctorSchedule.scheduleId,
        videoCallingId,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });

    // Update doctor's schedule
    await transactionClient.doctorSchedule.updateMany({
      where: {
        doctorId: isDoctorExists.id,
        scheduleId: isExistsDoctorSchedule.scheduleId,
      },
      data: {
        isBooked: true,
        appointmentId: result.id,
      },
    });

    // Create payment
    const transactionId: string = generateTransactionId(result.id);

    await transactionClient.payment.create({
      data: {
        appointmentId: result.id,
        amount: result.doctor.apointmentFee,
        transactionId,
      },
    });

    // Format the start and end date/times
    const formattedStartDateTime = formatDateTime(
      result.schedule.startDate.toString(),
    );
    const formattedEndDateTime = formatDateTime(
      result.schedule.endDate.toString(),
    );

    // Create notification for patient
    const patientUser = await prisma.user.findFirst({
      where: {
        email: isPatientExists.email,
      },
    });
    if (!patientUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found!');
    }
    const patientSlugMetaData = `Appointment Confirmed with ${result.doctor.name}`;
    const patientNotificationSlug = slugGenerator(patientSlugMetaData);
    const patientNotification = {
      title: 'Appointment Confirmed',
      content: `Your appointment with ${result.doctor.name} is confirmed on ${formattedStartDateTime} to ${formattedEndDateTime}.`,
      recipientId: patientUser.id,
      recipientType: NotificationRecipientType.PATIENT,
      slug: patientNotificationSlug,
    };

    const paymentSlugMetaData = `Payment Pending for Appointment with ${result.doctor.name}`;
    const paymentNotificationSlug = slugGenerator(paymentSlugMetaData);

    const patientPaymentNotification = {
      title: 'Complete Your Payment',
      content: `Your appointment with ${result.doctor.name} is reserved. Please complete the payment within 30 minutes to confirm your booking. Your appointment is scheduled on ${formattedStartDateTime} to ${formattedEndDateTime}. Failure to complete the payment will result in the cancellation of your appointment.`,
      recipientId: patientUser.id,
      recipientType: NotificationRecipientType.PATIENT,
      slug: paymentNotificationSlug,
    };

    // Create notification for doctor
    const doctorUser = await prisma.user.findFirst({
      where: {
        email: isDoctorExists.email,
      },
    });
    if (!doctorUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Doctor not found!');
    }

    const doctorSlugMetaData = `New appointment with ${isPatientExists.name}`;
    const doctorNotificationSlug = slugGenerator(doctorSlugMetaData);
    const doctorNotification = {
      title: 'New Appointment',
      content: `You have a new appointment with ${isPatientExists.name} on ${formattedStartDateTime} to ${formattedEndDateTime}.`,
      recipientId: doctorUser.id,
      recipientType: NotificationRecipientType.DOCTOR,
      slug: doctorNotificationSlug,
    };

    await transactionClient.notification.createMany({
      data: [
        patientPaymentNotification,
        patientNotification,
        doctorNotification,
      ],
    });

    // Emit notifications via Socket.IO
    io.to(doctorUser.id).emit('newNotification', doctorNotification);
    io.to(patientUser.id).emit('newNotification', patientPaymentNotification);
    io.to(patientUser.id).emit('newNotification', patientNotification);

    return result;
  });
};

const getMyAppointment = async (
  filters: any,
  options: IPaginationOptions,
  authUser: IAuthUser,
): Promise<IGenericResponse<Appointment[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const andConditions = [];

  if (authUser?.role === UserRole.PATIENT) {
    andConditions.push({
      patient: {
        email: authUser?.email,
      },
    });
  } else {
    andConditions.push({
      doctor: {
        email: authUser?.email,
      },
    });
  }

  if (Object.keys(filters).length > 0) {
    andConditions.push({
      AND: Object.keys(filters).map(key => ({
        [key]: {
          equals: (filters as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.AppointmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.appointment.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include:
      authUser?.role === UserRole.PATIENT
        ? { doctor: true, schedule: true }
        : {
            patient: { include: { medicalReport: true, prescription: true } },
            schedule: true,
          },
  });
  const total = await prisma.appointment.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getAllFromDB = async (
  filters: any,
  options: IPaginationOptions,
): Promise<IGenericResponse<Appointment[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;
  const andConditions = [];

  // if (searchTerm) {
  //     andConditions.push({
  //         OR: appointmentSearchableFields.map(field => ({
  //             [field]: {
  //                 contains: searchTerm,
  //                 mode: 'insensitive',
  //             },
  //         })),
  //     });
  // }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        if (appointmentRelationalFields.includes(key)) {
          return {
            [appointmentRelationalFieldsMapper[key]]: {
              email: (filterData as any)[key],
            },
          };
        } else {
          return {
            [key]: {
              equals: (filterData as any)[key],
            },
          };
        }
      }),
    });
  }

  // console.dir(andConditions, { depth: Infinity })
  const whereConditions: Prisma.AppointmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.appointment.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include: {
      doctor: true,
      patient: true,
    },
  });
  const total = await prisma.appointment.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const cancelUnpaidAppointments = async (io: Server) => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const unPaidAppointments = await prisma.appointment.findMany({
    where: {
      paymentStatus: PaymentStatus.UNPAID,
      createdAt: {
        lte: thirtyMinutesAgo,
      },
    },
    include: {
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
    },
  });

  const appointmentIdsToCancel = unPaidAppointments.map(
    appointment => appointment.id,
  );
  //const scheduleIdsToCancel = uppaidAppointments.map(appointment => appointment.scheduleId);

  await prisma.$transaction(async transactionClient => {
    await transactionClient.payment.deleteMany({
      where: {
        appointmentId: {
          in: appointmentIdsToCancel,
        },
      },
    });

    await transactionClient.appointment.deleteMany({
      where: {
        id: {
          in: appointmentIdsToCancel,
        },
      },
    });

    await asyncForEach(unPaidAppointments, async (appointment: any) => {
      await transactionClient.doctorSchedule.updateMany({
        where: {
          AND: [
            {
              doctorId: appointment.doctorId,
            },
            {
              scheduleId: appointment.scheduleId,
            },
          ],
        },
        data: {
          isBooked: false,
        },
      });

      console.log(appointment);
      // Create notification for doctor
      const doctorSlugMetaData = `Appointment Cancelled by Patient ${appointment.patient.name}`;
      const doctorNotificationSlug = slugGenerator(doctorSlugMetaData);
      const doctorNotification = {
        title: 'Appointment Cancelled',
        content: `Your appointment with ${appointment.patient.name} has been cancelled.`,
        recipientId: appointment.doctor.user.id,
        recipientType: NotificationRecipientType.DOCTOR,
        slug: doctorNotificationSlug,
      };

      // Create notification for patient
      const patientSlugMetaData = `Appointment Cancelled with ${appointment.doctor.name}`;
      const patientNotificationSlug = slugGenerator(patientSlugMetaData);
      const patientNotification = {
        title: 'Appointment Cancelled',
        content: `Your appointment with Dr. ${appointment.doctor.name} has been cancelled due to payment failure. Please ensure payment is completed for future appointments.`,
        recipientId: appointment.patient.user.id,
        recipientType: NotificationRecipientType.PATIENT,
        slug: patientNotificationSlug,
      };

      await transactionClient.notification.createMany({
        data: [patientNotification, doctorNotification],
      });

      io.to(appointment.doctor.user.id).emit(
        'newNotification',
        doctorNotification,
      );
      io.to(appointment.patient.user.id).emit(
        'newNotification',
        patientNotification,
      );
    });
  });
};

const changeAppointmentStatus = async (
  appointmentId: string,
  status: AppointmentStatus,
  user: any,
) => {
  const isDoctorsAppointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      paymentStatus: PaymentStatus.PAID,
    },
    include: {
      doctor: true,
    },
  });

  if (!isDoctorsAppointment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Appointment not found!');
  }

  if (user.role === UserRole.DOCTOR) {
    if (!(user.email === isDoctorsAppointment?.doctor.email)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'This is not your appointment!',
      );
    }
  }

  const result = await prisma.appointment.update({
    where: {
      id: appointmentId,
    },
    data: {
      status,
    },
  });
  return result;
};

export const AppointmentServices = {
  createAppointment,
  getMyAppointment,
  getAllFromDB,
  cancelUnpaidAppointments,
  changeAppointmentStatus,
};

/* 

{
  id: "appointment-id", // Unique ID of the appointment
  patientId: "patient-id", // ID of the related patient
  doctorId: "doctor-id", // ID of the related doctor
  scheduleId: "schedule-id", // ID of the related schedule
  videoCallingId: "video-call-id", // ID for video calling
  status: "SCHEDULED", // Appointment status (default: SCHEDULED)
  paymentStatus: "UNPAID", // Payment status (default: UNPAID)
  notes: "Some notes", // Any notes for the appointment
  createdAt: "2025-01-28T12:00:00.000Z", // Creation timestamp
  updatedAt: "2025-01-28T12:30:00.000Z", // Last update timestamp
  patient: { // Related patient data
    id: "patient-id",
    email: "patient@example.com",
    name: "John Doe",
    profilePhoto: "profile-photo-url",
    contactNumber: "1234567890",
    address: "Patient Address",
    isDeleted: false,
    createdAt: "2025-01-27T10:00:00.000Z",
    updatedAt: "2025-01-28T12:00:00.000Z",
    user: { // Related user data for the patient
      id: "user-id",
      email: "patient@example.com",
      password: "hashed-password",
      role: "PATIENT", // User role
      needPasswordChange: true,
      status: "ACTIVE", // User status
      createdAt: "2025-01-01T08:00:00.000Z",
      updatedAt: "2025-01-28T12:00:00.000Z"
    }
  },
  doctor: { // Related doctor data
    id: "doctor-id",
    email: "doctor@example.com",
    name: "Dr. Smith",
    profilePhoto: "doctor-profile-url",
    contactNumber: "9876543210",
    city: "Doctor's City",
    address: "Doctor's Address",
    registrationNumber: "REG123",
    experience: 10,
    gender: "MALE",
    apointmentFee: 500,
    qualification: "MBBS",
    currentWorkingPlace: "Hospital",
    designation: "Consultant",
    isDeleted: false,
    createdAt: "2025-01-15T09:00:00.000Z",
    updatedAt: "2025-01-28T11:00:00.000Z",
    user: { // Related user data for the doctor
      id: "user-id-doctor",
      email: "doctor@example.com",
      password: "hashed-password",
      role: "DOCTOR",
      needPasswordChange: false,
      status: "ACTIVE",
      createdAt: "2025-01-01T08:00:00.000Z",
      updatedAt: "2025-01-28T11:00:00.000Z"
    }
  }
}
*/
