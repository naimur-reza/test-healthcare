import { z } from 'zod';

const createDepartment = z.object({
  body: z.object({
    departmentName: z.string().min(1, 'Department name is required'),
    doctors: z.array(z.string().uuid()).refine(arr => arr.length > 0, {
      message: 'At least one doctor must be assigned to the department.',
    }),
    isDeleted: z.boolean().optional().default(false),
  }),
});

export const DepartmentValidation = {
  create: createDepartment,
};
