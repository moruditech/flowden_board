'use strict';

const Membership = require('../models/Membership.model');
const AppError   = require('../utils/AppError');

/**
 * Role rank map — higher number = more authority.
 * Used for range checks: rank[userRole] >= rank[minRole]
 */
const ROLE_RANK = { member: 0, admin: 1, owner: 2 };

/**
 * Middleware factory: authorize(minRole)
 *
 * Verifies that the authenticated user (req.user) has at least `minRole`
 * in the organization identified by req.params.orgId.
 *
 * On success: attaches req.membership for downstream use without a
 * second DB hit.
 *
 * Returns:
 *   400 — if orgId is missing from params
 *   404 — if the user is not a member of the org (org not found from their perspective)
 *   403 — if the user's role is insufficient
 *
 * Usage:
 *   router.delete('/:orgId', authenticate, authorize('owner'), deleteOrg);
 *   router.post('/:orgId/boards', authenticate, authorize('member'), createBoard);
 */
function authorize(minRole) {
  return async function authorizeMiddleware(req, res, next) {
    try {
      const orgId = req.params.orgId;

      if (!orgId) {
        return next(AppError.badRequest('Organization ID is required in route params'));
      }

      const membership = await Membership.findOne({
        user:         req.user.id,
        organization: orgId,
      }).lean();

      if (!membership) {
        // Return 404 so callers can't enumerate which orgs exist
        return next(AppError.notFound('Organization'));
      }

      const userRank = ROLE_RANK[membership.role] ?? -1;
      const minRank  = ROLE_RANK[minRole]         ?? 999;

      if (userRank < minRank) {
        return next(
          AppError.forbidden(
            `This action requires the '${minRole}' role. Your current role is '${membership.role}'.`
          )
        );
      }

      // Attach for downstream controllers so they don't re-query
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = authorize;
