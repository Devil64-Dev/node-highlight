import { CallbackResponse, CompiledMode } from '../types';

export default class Response implements CallbackResponse {
  data: Record<string, unknown>;

  isMatchIgnored: boolean;

  constructor(mode: CompiledMode) {
    if (mode.data === undefined) {
      mode.data = {};
    }
    this.data = mode.data;
    this.isMatchIgnored = false;
  }

  ignoreMatch = () => {
    this.isMatchIgnored = true;
  };
}
