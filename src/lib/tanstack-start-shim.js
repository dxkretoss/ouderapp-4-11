export function createServerFn(options) {
  let _validator = null;
  let _handler = null;

  const fn = async (args) => {
    let data = args?.data;
    if (_validator) {
      data = _validator(data);
    }
    if (_handler) {
      return await _handler({ data });
    }
    return null;
  };

  fn.inputValidator = (v) => {
    _validator = v;
    return fn;
  };
  fn.validator = (v) => {
    _validator = v;
    return fn;
  };
  fn.handler = (h) => {
    _handler = h;
    return fn;
  };

  return fn;
}

export function useServerFn(serverFn) {
  return serverFn;
}

export const createStart = () => ({});
export const createCsrfMiddleware = () => ({});
export const createMiddleware = () => ({});

