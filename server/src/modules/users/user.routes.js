'use strict';
const { Router }      = require('express');
const authenticate    = require('../../shared/middleware/authenticate');
const validate        = require('../../shared/middleware/validate');
const schemas         = require('./user.validation');
const ctrl            = require('./user.controller');

const router = Router();
router.use(authenticate);

router.get('/',            ctrl.getMe);
router.patch('/',          validate(schemas.updateProfile),  ctrl.updateMe);
router.patch('/password',  validate(schemas.changePassword), ctrl.changePassword);
router.delete('/',         ctrl.deleteMe);

module.exports = router;
