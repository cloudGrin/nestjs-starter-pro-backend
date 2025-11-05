/**
 * 数组工具类
 */
export class ArrayUtil {
  /**
   * 数组去重
   * @example unique([1, 2, 2, 3]) => [1, 2, 3]
   */
  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  /**
   * 对象数组根据属性去重
   * @example uniqueBy([{id:1},{id:2},{id:1}], 'id') => [{id:1},{id:2}]
   */
  static uniqueBy<T>(arr: T[], key: keyof T): T[] {
    const seen = new Set();
    return arr.filter((item) => {
      const k = item[key];
      if (seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });
  }

  /**
   * 数组分组
   * @example groupBy([{type:'a',val:1},{type:'b',val:2},{type:'a',val:3}], 'type')
   * => { a: [{type:'a',val:1},{type:'a',val:3}], b: [{type:'b',val:2}] }
   */
  static groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce(
      (result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
          result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * 数组分块
   * @example chunk([1,2,3,4,5], 2) => [[1,2],[3,4],[5]]
   */
  static chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 数组差集 (arr1中有但arr2中没有的)
   * @example difference([1,2,3], [2,3,4]) => [1]
   */
  static difference<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter((item) => !set2.has(item));
  }

  /**
   * 数组交集
   * @example intersection([1,2,3], [2,3,4]) => [2,3]
   */
  static intersection<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter((item) => set2.has(item));
  }

  /**
   * 数组并集
   * @example union([1,2], [2,3]) => [1,2,3]
   */
  static union<T>(...arrays: T[][]): T[] {
    return this.unique(arrays.flat());
  }

  /**
   * 数组扁平化
   * @example flatten([1,[2,[3,4]]]) => [1,2,3,4]
   */
  static flatten<T>(arr: any[], depth = Infinity): T[] {
    return arr.flat(depth);
  }

  /**
   * 数组求和
   * @example sum([1,2,3]) => 6
   */
  static sum(arr: number[]): number {
    return arr.reduce((sum, num) => sum + num, 0);
  }

  /**
   * 对象数组求和
   * @example sumBy([{val:1},{val:2}], 'val') => 3
   */
  static sumBy<T>(arr: T[], key: keyof T): number {
    return arr.reduce((sum, item) => {
      const value = item[key];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }

  /**
   * 数组平均值
   */
  static average(arr: number[]): number {
    return arr.length > 0 ? this.sum(arr) / arr.length : 0;
  }

  /**
   * 数组最大值
   */
  static max(arr: number[]): number {
    return Math.max(...arr);
  }

  /**
   * 数组最小值
   */
  static min(arr: number[]): number {
    return Math.min(...arr);
  }

  /**
   * 对象数组根据属性查找
   * @example findBy([{id:1},{id:2}], 'id', 2) => {id:2}
   */
  static findBy<T>(arr: T[], key: keyof T, value: any): T | undefined {
    return arr.find((item) => item[key] === value);
  }

  /**
   * 对象数组根据属性过滤
   */
  static filterBy<T>(arr: T[], key: keyof T, value: any): T[] {
    return arr.filter((item) => item[key] === value);
  }

  /**
   * 数组排序
   * @param arr 数组
   * @param key 排序字段
   * @param order 排序方向
   */
  static sortBy<T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * 数组随机打乱
   */
  static shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 随机取一个元素
   */
  static sample<T>(arr: T[]): T | undefined {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * 随机取n个元素
   */
  static sampleSize<T>(arr: T[], n: number): T[] {
    const shuffled = this.shuffle(arr);
    return shuffled.slice(0, Math.min(n, arr.length));
  }

  /**
   * 移除数组中的假值 (false, null, 0, "", undefined, NaN)
   */
  static compact<T>(arr: T[]): T[] {
    return arr.filter(Boolean);
  }

  /**
   * 数组转对象
   * @example toObject([{id:1,name:'a'}], 'id') => {1:{id:1,name:'a'}}
   */
  static toObject<T>(arr: T[], key: keyof T): Record<string, T> {
    return arr.reduce(
      (obj, item) => {
        obj[String(item[key])] = item;
        return obj;
      },
      {} as Record<string, T>,
    );
  }

  /**
   * 提取对象数组的某个属性
   * @example pluck([{id:1,name:'a'},{id:2,name:'b'}], 'name') => ['a','b']
   */
  static pluck<T, K extends keyof T>(arr: T[], key: K): T[K][] {
    return arr.map((item) => item[key]);
  }

  /**
   * 判断数组是否为空
   */
  static isEmpty<T>(arr: T[] | null | undefined): boolean {
    return !arr || arr.length === 0;
  }

  /**
   * 判断数组是否不为空
   */
  static isNotEmpty<T>(arr: T[] | null | undefined): boolean {
    return !this.isEmpty(arr);
  }

  /**
   * 数组分页
   */
  static paginate<T>(arr: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize;
    return arr.slice(start, start + pageSize);
  }

  /**
   * 数组范围生成
   * @example range(1, 5) => [1,2,3,4,5]
   */
  static range(start: number, end: number, step = 1): number[] {
    const result: number[] = [];
    for (let i = start; i <= end; i += step) {
      result.push(i);
    }
    return result;
  }
}
