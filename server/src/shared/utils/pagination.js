'use strict';

/**
 * Parse page + limit query params into safe integers with a skip value.
 * Clamps limit to 1–100 and page to minimum 1.
 */
function parsePagination(query = {}) {
  const page  = Math.max(1, parseInt(query.page  || '1',   10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build the pagination metadata object returned in API responses.
 */
function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

module.exports = { parsePagination, buildMeta };
