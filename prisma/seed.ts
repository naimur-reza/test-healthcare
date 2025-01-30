import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Delete all entries for each model
        await prisma.prescription.deleteMany();
        await prisma.review.deleteMany();
        await prisma.payment.deleteMany();
        await prisma.appointment.deleteMany();
        await prisma.doctorSchedule.deleteMany();
        await prisma.schedule.deleteMany();
        await prisma.user.deleteMany(); // Ensure users are also deleted

        console.log('All data deleted successfully.');
    } catch (error) {
        console.error('Error in seeding data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error('Error in main:', error);
    process.exit(1);
});
