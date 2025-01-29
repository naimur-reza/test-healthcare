export interface IDepartment {
  id?: string;
  departmentName: string;
  isDeleted?: boolean;
  doctors: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDepartmentFilterRequest {
  departmentName?: string;
  isDeleted?: boolean;
  [key: string]: any;
}
