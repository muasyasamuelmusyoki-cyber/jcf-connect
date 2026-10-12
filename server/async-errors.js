'use strict';

// Express 4 does not forward rejected promises from async route handlers.
// Wrap callbacks registered on routers so failures reach the normal error
// middleware instead of becoming unhandled promise rejections.
const express = require('express');
const routerPrototype = Object.getPrototypeOf(express.Router());
const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all', 'use'];

function wrapHandler(handler) {
  if (typeof handler !== 'function' || handler.length === 4 || handler.__jcfPromiseAware) {
    return handler;
  }

  function promiseAwareHandler(req, res, next) {
    try {
      const result = handler.call(this, req, res, next);
      if (result && typeof result.then === 'function') {
        result.catch(next);
      }
      return result;
    } catch (error) {
      return next(error);
    }
  }
  Object.defineProperty(promiseAwareHandler, '__jcfPromiseAware', { value: true });
  return promiseAwareHandler;
}

for (const method of methods) {
  const original = routerPrototype[method];
  if (typeof original !== 'function') continue;

  routerPrototype[method] = function (...args) {
    const wrapped = args.map((arg) => {
      if (Array.isArray(arg)) return arg.map(wrapHandler);
      return wrapHandler(arg);
    });
    return original.apply(this, wrapped);
  };
}
