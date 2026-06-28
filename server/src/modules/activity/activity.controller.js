'use strict';
const svc          = require('./activity.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success }  = require('../../shared/utils/apiResponse');

const listActivity = asyncHandler(async (req, res) => {
  const result = await svc.listForOrg(req.params.orgId, req.query);
  success(res, result.items, 200, result.meta);
});

module.exports = { listActivity };
