class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => new HttpError(400, msg);
const conflict = (msg) => new HttpError(409, msg);
const unprocessable = (msg) => new HttpError(422, msg);
const notFound = (msg = 'Data tidak ditemukan.') => new HttpError(404, msg);
module.exports = { HttpError, bad, conflict, unprocessable, notFound };
