import { Request, Response, NextFunction } from 'express';
import { Prisma, CustomerStatus, CustomerType } from '@prisma/client';
import { prisma } from '../services';

class CustomerControllerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CustomerControllerError.prototype);
  }
}

// 1. Fetch Paginated & Filtered Customers List
export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    // Prevent excessive page limits
    const pageSize = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * pageSize;

    const { search, status, customerType, sortBy, sortOrder } = req.query;

    const where: Prisma.CustomerWhereInput = {};

    // A. Enforce Case-Insensitive Search on specific columns
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // B. Filter by status
    if (status && Object.values(CustomerStatus).includes(status as CustomerStatus)) {
      where.status = status as CustomerStatus;
    }

    // C. Filter by type
    if (customerType && Object.values(CustomerType).includes(customerType as CustomerType)) {
      where.customerType = customerType as CustomerType;
    }

    // D. Validate and sort by approved fields only (Allowlist)
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'businessName', 'followUpDate'];
    const sortField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDirection: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [sortField]: orderDirection },
        skip,
        take: pageSize,
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: customers,
      pagination: {
        page,
        limit: pageSize,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Fetch Customer Details along with Follow-up History
export const getCustomerDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new CustomerControllerError('Customer record not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Customer details retrieved successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a Customer Profile
export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      address,
      status,
      followUpDate,
      notes,
    } = req.body;

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email: email.toLowerCase(),
        businessName,
        gstNumber: gstNumber || null,
        customerType,
        address,
        status,
        followUpDate: followUpDate || null,
        notes: notes || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Customer profile created successfully',
      data: newCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Customer Information
export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify existence
    const exists = await prisma.customer.findUnique({ where: { id } });
    if (!exists) {
      throw new CustomerControllerError('Customer record not found', 404);
    }

    const {
      name,
      mobile,
      email,
      businessName,
      gstNumber,
      customerType,
      address,
      status,
      followUpDate,
      notes,
    } = req.body;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        mobile,
        email: email ? email.toLowerCase() : undefined,
        businessName,
        gstNumber: gstNumber === null ? null : gstNumber || undefined,
        customerType,
        address,
        status,
        followUpDate: followUpDate === null ? null : followUpDate || undefined,
        notes: notes === null ? null : notes || undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Customer profile updated successfully',
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Add a Follow-up Log to a Customer (Atomic Database Transaction)
export const createFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: customerId } = req.params;
    const { note, followUpDate } = req.body;

    if (!req.user) {
      throw new CustomerControllerError('User is unauthenticated', 401);
    }

    const createdBy = req.user.id;

    // Check customer existence
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new CustomerControllerError('Customer record not found', 404);
    }

    // Execute atomic transaction: Create follow-up and sync customer follow-up metadata
    const result = await prisma.$transaction(async (tx) => {
      const followUp = await tx.customerFollowUp.create({
        data: {
          customerId,
          note,
          followUpDate,
          createdBy,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          followUpDate,
          notes: note, 
        },
      });

      return followUp;
    });

    res.status(201).json({
      success: true,
      message: 'Customer follow-up note logged successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
