const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const idParams = z.object({ id: objectId });
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
};
const paginationQuery = z.object(pagination);

module.exports = { objectId, idParams, pagination, paginationQuery, z };
