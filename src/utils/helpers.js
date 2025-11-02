// Response helper functions
exports.sendResponse = (res, statusCode, success, message, data = null) => {
  const response = {
    success,
    message
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

exports.sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

exports.sendSuccess = (res, message, data = null, statusCode = 200) => {
  return exports.sendResponse(res, statusCode, true, message, data);
};

// Pagination helper
exports.getPagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / itemsPerPage);
  
  return {
    currentPage,
    totalPages,
    itemsPerPage,
    total,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

// Query helper for filtering
exports.buildQuery = (queryParams, allowedFilters = []) => {
  const query = {};
  
  allowedFilters.forEach(filter => {
    if (queryParams[filter] !== undefined) {
      if (filter === 'search') {
        query.$text = { $search: queryParams[filter] };
      } else if (typeof queryParams[filter] === 'boolean') {
        query[filter] = queryParams[filter];
      } else {
        query[filter] = queryParams[filter];
      }
    }
  });
  
  return query;
};

// Sort helper
exports.buildSort = (sortParam, defaultSort = { createdAt: -1 }) => {
  if (!sortParam) return defaultSort;
  
  const sortField = sortParam.replace('-', '');
  const sortOrder = sortParam.startsWith('-') ? -1 : 1;
  
  return { [sortField]: sortOrder };
};