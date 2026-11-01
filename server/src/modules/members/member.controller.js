import { sendSuccess } from '../../utils/ApiResponse.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { createMemberService } from './member.service.js'

export function createMemberController({ MemberModel, AuditLogModel }) {
  const memberService = createMemberService({ MemberModel, AuditLogModel })

  return {
    create: asyncHandler(async (req, res) => {
      const member = await memberService.create(req.body, req.admin.id, req.ip)
      sendSuccess(res, { member }, 'Member created successfully', 201)
    }),

    list: asyncHandler(async (req, res) => {
      const result = await memberService.list(req.validatedQuery)
      sendSuccess(res, result, 'Members retrieved successfully')
    }),

    getById: asyncHandler(async (req, res) => {
      const member = await memberService.getById(req.validatedParams.memberId)
      sendSuccess(res, { member }, 'Member retrieved successfully')
    }),

    update: asyncHandler(async (req, res) => {
      const member = await memberService.update(
        req.validatedParams.memberId,
        req.body,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { member }, 'Member updated successfully')
    }),

    setStatus: asyncHandler(async (req, res) => {
      const member = await memberService.setStatus(
        req.validatedParams.memberId,
        req.body.status,
        req.admin.id,
        req.ip,
      )
      sendSuccess(res, { member }, 'Member status updated successfully')
    }),
  }
}
