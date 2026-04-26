function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(query.limit, 10) || 20, 1);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

module.exports = { getPagination };
