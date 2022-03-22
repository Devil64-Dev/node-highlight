import { Logger } from '../types';

const logger: Logger = {
  info: (message: string | unknown) => {
    console.info(message);
  },
  error: (message: string | unknown) => {
    console.error(message);
  },
  warn: (message: string | unknown) => {
    console.warn(message);
  },
};

export default logger;
