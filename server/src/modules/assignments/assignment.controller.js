import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createAssignmentService } from './assignment.service.js'

export function createAssignmentController({
  MemberModel,
  TrainerModel,
  AssignmentModel,
  AuditLogModel,
}) {
  const service = createAssignmentService({
    MemberModel,
    TrainerModel,
    AssignmentModel,
    AuditLogModel,
  })

  return {
    create: asyncHandler(async (req, res) => {
      const assignment = await service.create(req.body, req.admin.id, req.ip)
      sendSuccess(res, { assignment }, 'Trainer assigned successfully', 201)
    }),

    list: asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        await service.list(req.validatedQuery),
        'Trainer assignments retrieved successfully',
      )
    }),

    listByMember: asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        await service.listByMember(req.validatedParams.memberId, req.validatedQuery),
        'Member trainer assignments retrieved successfully',
      )
    }),

    listByTrainer: asyncHandler(async (req, res) => {
      sendSuccess(
        res,
        await service.listByTrainer(req.validatedParams.trainerId, req.validatedQuery),
        'Trainer assignment history retrieved successfully',
      )
    }),

    getById: asyncHandler(async (req, res) => {
      const assignment = await service.getById(req.validatedParams.assignmentId)
      sendSuccess(res, { assignment }, 'Trainer assignment retrieved successfully')
    }),

    end: asyncHandler(async (req, res) => {
      const assignment = await service.end(
        req.validatedParams.assignmentId,
        req.body.endDate,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { assignment }, 'Trainer assignment ended successfully')
    }),
  }
}
