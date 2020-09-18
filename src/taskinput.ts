import { Input } from './Input';

export class TaskInput extends Input<string> {
  protected async defaultString(): Promise<string> {
    return '';
  }

  protected async valueToString(value: string): Promise<string> {
    return value;
  }

  protected async stringToValue(str: string): Promise<string> {
    return str;
  }

  protected async validateContent(_str: string): Promise<boolean> {
    return true;
  }
}
