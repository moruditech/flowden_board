'use strict';

const User         = require('../../shared/models/User.model');
const RefreshToken = require('../../shared/models/RefreshToken.model');
const { hashPassword, comparePassword } = require('../../shared/utils/bcrypt');
const AppError  = require('../../shared/utils/AppError');
const eventBus  = require('../../shared/events/eventBus');

const userService = {
  async getById(userId) {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('User');
    return user.toJSON();
  },

  async updateProfile(userId, { name, avatarUrl }) {
    const update = {};
    if (name      !== undefined) update.name      = name;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!user) throw AppError.notFound('User');
    return user.toJSON();
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw AppError.notFound('User');

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw AppError.badRequest('Current password is incorrect');

    user.passwordHash = await hashPassword(newPassword);
    await user.save({ validateBeforeSave: false });

    // Revoke all sessions — force login on all devices
    await RefreshToken.deleteMany({ user: userId });
  },

  async deleteAccount(userId) {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('User');

    // Soft delete — keeps email so the slot isn't re-used maliciously
    user.isActive = false;
    user.name     = 'Deleted User';
    await user.save({ validateBeforeSave: false });

    await RefreshToken.deleteMany({ user: userId });

    eventBus.emit('user.deleted', { user: user.toJSON() });
  },
};

module.exports = userService;
