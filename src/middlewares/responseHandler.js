// ...existing code...
module.exports = function responseHandler() {
  return (req, res, next) => {
    const sendPayload = (status, success, opts = {}, data = null) => {
      const payload = {
        success,
        status,
        message: opts.message || (success ? "OK" : "Error"),
        data: data !== undefined ? data : null
      
      };
      return res.status(status).json(payload);
    };

    res.ok = (data, message, meta) => sendPayload(200, true, { message, meta }, data);
    res.created = (data, message, meta) => sendPayload(201, true, { message, meta }, data);
    res.error = (status = 500, message, errors) => sendPayload(status, false, { message, errors }, null);

    next();
  };
};
