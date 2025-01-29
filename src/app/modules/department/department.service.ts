import { Department, Prisma } from '@prisma/client';
import prisma from '../../../shared/prisma';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { IDepartment, IDepartmentFilterRequest } from './department.interface';

const createDepartment = async (data: Department): Promise<Department> => {
  const result = await prisma.department.create({
    data,
  });
  return result;
};

const getAllDepartments = async (
  filters: IDepartmentFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<Department[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { departmentName, isDeleted, ...filterData } = filters;

  const andConditions: Prisma.DepartmentWhereInput[] = [];

  if (departmentName) {
    andConditions.push({
      departmentName: {
        contains: departmentName,
        mode: 'insensitive',
      },
    });
  }

  if (isDeleted !== undefined) {
    andConditions.push({ isDeleted });
  }

  if (Object.keys(filterData).length > 0) {
    const filterConditions = Object.keys(filterData).map(key => ({
      [key]: { equals: (filterData as any)[key] },
    }));
    andConditions.push(...filterConditions);
  }

  andConditions.push({ isDeleted: false });

  const whereConditions: Prisma.DepartmentWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.department.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { departmentName: 'asc' },
    include: {
      _count: {
        select: { doctors: true },
      },
    },
  });

  const total = await prisma.department.count({ where: whereConditions });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};


const getDepartmentById = async (id: string): Promise<Department | null> => {
  const result = await prisma.department.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });
  return result;
};

const updateDepartment = async (
  id: string,
  payload: Partial<IDepartment>,
): Promise<Department | null> => {
  const { doctors, ...updateData } = payload;

  const result = await prisma.department.update({
    where: { id },
    data: {
      ...updateData,
      ...(doctors && {
        doctors: {
          set: doctors.map(doctorId => ({ id: doctorId })),
        },
      }),
    },
    include: {
      doctors: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unable to update Department');
  }

  return result;
};

const deleteDepartment = async (id: string): Promise<Department> => {
  const department = await prisma.department.findUnique({
    where: { id },
    select: { isDeleted: true },
  });

  if (!department) {
    throw new Error('Department not found');
  }

  const updatedDepartment = await prisma.department.update({
    where: { id },
    data: {
      isDeleted: !department.isDeleted,
    },
  });

  return updatedDepartment;
};

export const DepartmentService = {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
};
