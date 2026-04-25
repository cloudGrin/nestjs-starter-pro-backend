/**
 * 树形数据工具类
 */
export class TreeUtil {
  static arrayToTree<T extends Record<string, any>>(
    arr: T[],
    options: {
      idKey?: string;
      parentKey?: string;
      childrenKey?: string;
      rootValue?: any;
    } = {},
  ): T[] {
    const {
      idKey = 'id',
      parentKey = 'parentId',
      childrenKey = 'children',
      rootValue = 0,
    } = options;

    const map = new Map<any, T & { [key: string]: any }>();
    const roots: T[] = [];

    arr.forEach((item) => {
      map.set(item[idKey], { ...item, [childrenKey]: [] });
    });

    arr.forEach((item) => {
      const node = map.get(item[idKey])!;
      const parentId = item[parentKey];

      if (parentId === rootValue || parentId === null || parentId === undefined) {
        roots.push(node);
        return;
      }

      const parent = map.get(parentId);
      if (parent) {
        parent[childrenKey].push(node);
      }
    });

    return roots;
  }
}
