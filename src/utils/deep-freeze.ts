const modFn = (type: string) => (() => { throw new Error(`${type} is read-only`); });

type RemoveSignature<T> = {
  [keyType in keyof T as object extends Record<keyType, unknown> ? never : keyType]: T[keyType];
};
const deepFreeze = <T>(obj: T & { [key: string]: unknown }): RemoveSignature<T> => {
  if (obj instanceof Map) {
    const _modFn = modFn('Map');
    obj.clear = _modFn;
    obj.delete = _modFn;
    obj.set = _modFn;
  } else if (obj instanceof Set) {
    const _modFn = modFn('Set');
    obj.add = _modFn;
    obj.clear = _modFn;
    obj.delete = _modFn;
  }

  Object.freeze(obj);

  Object.getOwnPropertyNames(obj).forEach((key) => {
    const prop = obj[key];
    if (typeof prop === 'object' && !Object.isFrozen(obj)) {
      deepFreeze(prop as T & { [key: string]: unknown });
    }
  });

  return obj;
};

export default deepFreeze;
