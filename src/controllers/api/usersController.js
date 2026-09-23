const db = require('../../database/models');
const { PAGE_SIZE, absoluteUrl, pageNumber, paginationUrls } = require('../../utils/apiHelpers');

const SENSITIVE_USER_FIELDS = ['password', 'userCategoryId', 'category'];

function publicUser(user, req) {
  const json = user.toJSON();
  SENSITIVE_USER_FIELDS.forEach((field) => {
    delete json[field];
  });
  json.image = absoluteUrl(req, json.image);
  return json;
}

module.exports = {
  async list(req, res) {
    try {
      const page = pageNumber(req);
      const { count, rows } = await db.User.findAndCountAll({
        attributes: { exclude: ['password'] },
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        order: [['id', 'ASC']]
      });

      const { next, previous } = paginationUrls(req, count, page);

      res.json({
        count,
        users: rows.map((user) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          phone: user.phone || '',
          detail: absoluteUrl(req, `/api/users/${user.id}`)
        })),
        next,
        previous
      });
    } catch (error) {
      res.status(500).json({ error: 'No se pudo listar usuarios' });
    }
  },

  async detail(req, res) {
    try {
      const user = await db.User.findByPk(req.params.id, {
        attributes: { exclude: ['password'] }
      });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(publicUser(user, req));
    } catch (error) {
      res.status(500).json({ error: 'No se pudo obtener el usuario' });
    }
  }
};
