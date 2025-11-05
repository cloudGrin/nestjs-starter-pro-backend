/**
 * 对象工具类
 */
export class ObjectUtil {
  /**
   * 深拷贝
   * @param obj 要拷贝的对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item)) as any;
    }

    if (obj instanceof Object) {
      const cloned = {} as T;
      Object.keys(obj).forEach((key) => {
        (cloned as any)[key] = this.deepClone((obj as any)[key]);
      });
      return cloned;
    }

    return obj;
  }

  /**
   * 深度合并对象
   * @param target 目标对象
   * @param sources 源对象
   */
  static merge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;

    const source = sources.shift();
    if (!source) return target;

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        const sourceValue = (source as any)[key];
        const targetValue = (target as any)[key];

        if (this.isObject(sourceValue)) {
          if (!target[key as keyof T]) {
            Object.assign(target, { [key]: {} });
          }
          this.merge(targetValue, sourceValue);
        } else {
          Object.assign(target, { [key]: sourceValue });
        }
      });
    }

    return this.merge(target, ...sources);
  }

  /**
   * 移除对象中的空值 (null, undefined, '')
   */
  static removeEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: any = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (value !== null && value !== undefined && value !== '') {
        if (this.isObject(value)) {
          result[key] = this.removeEmpty(value);
        } else if (Array.isArray(value)) {
          result[key] = value.filter((item) => item !== null && item !== undefined && item !== '');
        } else {
          result[key] = value;
        }
      }
    });

    return result;
  }

  /**
   * 移除对象中的 null 和 undefined
   */
  static removeNullish<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: any = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * 对象扁平化
   * @example flatten({a: {b: {c: 1}}}) => {'a.b.c': 1}
   */
  static flatten(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (this.isObject(value) && !Array.isArray(value)) {
        this.flatten(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    });

    return result;
  }

  /**
   * 反扁平化
   * @example unflatten({'a.b.c': 1}) => {a: {b: {c: 1}}}
   */
  static unflatten(obj: Record<string, any>): any {
    const result: any = {};

    Object.keys(obj).forEach((key) => {
      const keys = key.split('.');
      let current = result;

      keys.forEach((k, index) => {
        if (index === keys.length - 1) {
          current[k] = obj[key];
        } else {
          current[k] = current[k] || {};
          current = current[k];
        }
      });
    });

    return result;
  }

  /**
   * 获取嵌套对象的值
   * @param obj 对象
   * @param path 路径 (支持 'a.b.c' 或 'a[0].b')
   * @param defaultValue 默认值
   */
  static get<T = any>(obj: any, path: string, defaultValue?: T): T {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let result = obj;

    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) {
        return defaultValue as T;
      }
    }

    return result as T;
  }

  /**
   * 设置嵌套对象的值
   * @param obj 对象
   * @param path 路径
   * @param value 值
   */
  static set(obj: any, path: string, value: any): void {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    keys.forEach((key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    });

    current[lastKey] = value;
  }

  /**
   * 判断是否有某个路径
   */
  static has(obj: any, path: string): boolean {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * 挑选对象的某些属性
   * @example pick({a:1,b:2,c:3}, ['a','c']) => {a:1,c:3}
   */
  static pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result: any = {};
    keys.forEach((key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * 排除对象的某些属性
   * @example omit({a:1,b:2,c:3}, ['b']) => {a:1,c:3}
   */
  static omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result: any = { ...obj };
    keys.forEach((key) => {
      delete result[key];
    });
    return result;
  }

  /**
   * 判断是否为对象
   */
  static isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * 判断对象是否为空
   */
  static isEmpty(obj: any): boolean {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  /**
   * 判断两个对象是否相等（深度比较）
   */
  static isEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
      return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.isEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  /**
   * 对象转查询字符串
   * @example toQueryString({a:1,b:2}) => 'a=1&b=2'
   */
  static toQueryString(obj: Record<string, any>): string {
    return Object.keys(obj)
      .filter((key) => obj[key] !== undefined && obj[key] !== null)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
      .join('&');
  }

  /**
   * 查询字符串转对象
   * @example fromQueryString('a=1&b=2') => {a:'1',b:'2'}
   */
  static fromQueryString(query: string): Record<string, string> {
    const result: Record<string, string> = {};
    const pairs = query.replace(/^\?/, '').split('&');

    pairs.forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key) {
        result[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });

    return result;
  }

  /**
   * 反转对象的键值
   * @example invert({a:'1',b:'2'}) => {'1':'a','2':'b'}
   */
  static invert(obj: Record<string, string | number>): Record<string, string> {
    const result: Record<string, string> = {};
    Object.keys(obj).forEach((key) => {
      result[String(obj[key])] = key;
    });
    return result;
  }
}
