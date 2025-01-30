import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt'; // To hash the password

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

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);

        // Seed Super Admin
        const superAdmin = await prisma.user.create({
            data: {

                "password": "newpassword",
                "admin": {
                    "email": "cloud@admin.com",
                    "name": "James Bond",
                    "contactNumber": "0191928181"
                }
            },
        });

        console.log('Super Admin Seeded:', superAdmin);
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
