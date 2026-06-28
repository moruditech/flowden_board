'use strict';
const { Router }   = require('express');
const authenticate = require('../../shared/middleware/authenticate');
const authorize    = require('../../shared/middleware/authorize');
const validate     = require('../../shared/middleware/validate');
const schemas      = require('./board.validation');
const ctrl         = require('./board.controller');

const router = Router();
router.use(authenticate);

router.get('/org/:orgId',  authorize('member'), ctrl.listBoards);
router.post('/org/:orgId', authorize('member'), validate(schemas.createBoard), ctrl.createBoard);

router.get('/:boardId',    ctrl.getBoard);
router.patch('/:boardId',  validate(schemas.updateBoard), ctrl.updateBoard);
router.delete('/:boardId', ctrl.deleteBoard);

module.exports = router;
