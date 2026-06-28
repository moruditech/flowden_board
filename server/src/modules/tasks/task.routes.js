'use strict';
const { Router }   = require('express');
const authenticate = require('../../shared/middleware/authenticate');
const validate     = require('../../shared/middleware/validate');
const schemas      = require('./task.validation');
const ctrl         = require('./task.controller');

const router = Router();
router.use(authenticate);

router.get('/board/:boardId',  ctrl.listTasks);
router.post('/board/:boardId', validate(schemas.createTask), ctrl.createTask);
router.get('/:taskId',         ctrl.getTask);
router.patch('/:taskId',       validate(schemas.updateTask), ctrl.updateTask);
router.patch('/:taskId/move',  validate(schemas.moveTask),   ctrl.moveTask);
router.delete('/:taskId',      ctrl.deleteTask);

module.exports = router;
