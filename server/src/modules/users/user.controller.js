'use strict';
const userService  = require('./user.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success }  = require('../../shared/utils/apiResponse');

const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  success(res, { user });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  success(res, { user });
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  success(res, { message: 'Password changed. Please log in again on all devices.' });
});

const deleteMe = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id);
  res.clearCookie('refresh_token');
  success(res, { message: 'Your account has been deleted.' });
});

module.exports = { getMe, updateMe, changePassword, deleteMe };
