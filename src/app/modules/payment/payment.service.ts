import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { sslServices } from "../ssl/ssl.service"
import { PaymentStatus } from "@prisma/client";
import Stripe from "stripe";
import config from "../../../config";
import { ENUM_USER_ROLE } from "../../../enums/user";
import { Server } from "socket.io";
import { formatDateTime, slugGenerator } from "../../../shared/utils";

const stripe = new Stripe(config.stripe.secret_key as string);

const initPayment = async (data: any, appointmentId: string) => {
    const appointmentData = await prisma.payment.findFirst({
        where: {
            appointmentId
        },
        include: {
            appointment: {
                include: {
                    patient: true
                }
            }
        }
    });

    if (!appointmentData) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Payment information not found!")
    }
    if (appointmentData.status === PaymentStatus.PAID) {
        throw new ApiError(httpStatus.BAD_REQUEST, "You already pay for the appointment!")
    }

    console.log(appointmentData)

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: appointmentData?.appointment?.patient?.email,
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Appointment Payment",
                    },
                    unit_amount: appointmentData.amount * 100,
                },
                quantity: 1,
            },
        ],
        metadata: {
            appointmentId: appointmentData.appointmentId,
            customerName: appointmentData.appointment.patient.name,
            customerEmail: appointmentData.appointment.patient.email,
        },
        mode: "payment",
        success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}&patient_id=${appointmentData.appointment.patientId}&appointment_id=${appointmentId}`,
        cancel_url: `http://localhost:3000/dashboard`,
        billing_address_collection: 'required',
    });

    return { paymentUrl: session.url };
};

const paymentSuccessIntoDB = async (
    session_id: string,
    patient_id: string,
    appointment_id: string,
    io: Server
) => {
    try {
        // find appointment
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointment_id },
        });
        if (!appointment) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Appointment not found');
        }

        // find patient
        const patient = await prisma.patient.findUnique({
            where: { id: patient_id },
        });
        if (!patient) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
        }
        const patientUser = await prisma.user.findUnique({
            where: { email: patient.email }
        })
        if (!patientUser) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Patient is not related with any user');
        }

        // Find SuperAdmin
        const superAdmin = await prisma.user.findFirst({
            where: { role: ENUM_USER_ROLE.SUPER_ADMIN },
        });
        if (!superAdmin) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Super Admin not found');
        }

        return await prisma.$transaction(async transactionClient => {
            const stripeSession: any = await stripe.checkout.sessions.retrieve(session_id);
            if (stripeSession?.payment_status !== 'paid') {
                throw new ApiError(httpStatus.PAYMENT_REQUIRED, 'Payment not successful');
            }

            const updatedAppointment = await transactionClient.appointment.update({
                where: { id: appointment_id },
                data: { paymentStatus: PaymentStatus.PAID },
                include: {
                    doctor: true,
                    schedule: true,
                    patient: true,
                }
            });

            // Send notification to patient
            const patientNotificationSlug = slugGenerator('Payment Successful');
            const formattedStartDateTime = formatDateTime(updatedAppointment.schedule.startDate.toString());
            const formattedEndDateTime = formatDateTime(updatedAppointment.schedule.endDate.toString());

            const patientNotification = {
                title: 'Payment Successful',
                content: `Dear ${patient.name}, your payment for the appointment with ${updatedAppointment.doctor.name} has been successfully processed. Your appointment is scheduled from ${formattedStartDateTime} to ${formattedEndDateTime}. Please be on time.`,
                recipientId: patientUser.id,
                recipientType: ENUM_USER_ROLE.PATIENT,
                slug: patientNotificationSlug,
            };

            // Send notification to Super Admin
            const superAdminNotificationSlug = slugGenerator('New Payment Received');

            const superAdminNotification = {
                title: 'New Payment Received',
                content: `A payment of $${updatedAppointment.doctor.apointmentFee} has been successfully processed for the appointment of ${patient.name} with Dr. ${updatedAppointment.doctor.name}. The appointment is scheduled from ${formattedStartDateTime} to ${formattedEndDateTime}.`,
                recipientId: superAdmin.id,
                recipientType: ENUM_USER_ROLE.SUPER_ADMIN,
                slug: superAdminNotificationSlug,
            };


            await transactionClient.notification.createMany({
                data: [patientNotification, superAdminNotification],
            });

            // Emit socket event
            io.to(patientUser.id).emit('newNotification', patientNotification);
            io.to(superAdmin.id).emit('newNotification', superAdminNotification);

            return updatedAppointment;
        })

    } catch (error) {
        console.log(error);
    }
}

export const PaymentService = {
    initPayment,
    paymentSuccessIntoDB,
}