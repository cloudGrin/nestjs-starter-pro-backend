/**
 * 树形数据工具类
 */
export class TreeUtil {
  /**
   * 数组转树形结构
   * @param arr 扁平数组
   * @param options 配置选项
   * @example
   * arrayToTree([
   *   {id:1, parentId:0, name:'a'},
   *   {id:2, parentId:1, name:'b'},
   *   {id:3, parentId:1, name:'c'}
   * ]) => [{id:1, parentId:0, name:'a', children:[{id:2,...},{id:3,...}]}]
   */
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

    // 创建映射
    arr.forEach((item) => {
      map.set(item[idKey], { ...item, [childrenKey]: [] });
    });

    // 构建树
    arr.forEach((item) => {
      const node = map.get(item[idKey])!;
      const parentId = item[parentKey];

      if (parentId === rootValue || parentId === null || parentId === undefined) {
        roots.push(node);
      } else {
        const parent = map.get(parentId);
        if (parent) {
          parent[childrenKey].push(node);
        }
      }
    });

    return roots;
  }

  /**
   * 树转数组（扁平化）
   * @param tree 树形数据
   * @param childrenKey 子节点字段名
   * @example
   * treeToArray([{id:1, children:[{id:2},{id:3}]}])
   * => [{id:1},{id:2},{id:3}]
   */
  static treeToArray<T extends Record<string, any>>(tree: T[], childrenKey = 'children'): T[] {
    const result: T[] = [];

    const traverse = (nodes: T[]) => {
      nodes.forEach((node) => {
        const children = node[childrenKey];
        const { [childrenKey]: _, ...rest } = node;
        result.push(rest as T);

        if (children && Array.isArray(children) && children.length > 0) {
          traverse(children);
        }
      });
    };

    traverse(tree);
    return result;
  }

  /**
   * 查找树节点
   * @param tree 树形数据
   * @param predicate 查找条件
   * @param childrenKey 子节点字段名
   */
  static findNode<T extends Record<string, any>>(
    tree: T[],
    predicate: (node: T) => boolean,
    childrenKey = 'children',
  ): T | null {
    for (const node of tree) {
      if (predicate(node)) {
        return node;
      }

      const children = node[childrenKey];
      if (children && Array.isArray(children) && children.length > 0) {
        const found = this.findNode(children, predicate, childrenKey);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * 查找节点路径
   * @param tree 树形数据
   * @param predicate 查找条件
   * @param childrenKey 子节点字段名
   * @returns 从根到目标节点的路径数组
   */
  static findPath<T extends Record<string, any>>(
    tree: T[],
    predicate: (node: T) => boolean,
    childrenKey = 'children',
  ): T[] | null {
    const path: T[] = [];

    const traverse = (nodes: T[]): boolean => {
      for (const node of nodes) {
        path.push(node);

        if (predicate(node)) {
          return true;
        }

        const children = node[childrenKey];
        if (children && Array.isArray(children) && children.length > 0) {
          if (traverse(children)) {
            return true;
          }
        }

        path.pop();
      }
      return false;
    };

    return traverse(tree) ? path : null;
  }

  /**
   * 过滤树节点
   * @param tree 树形数据
   * @param predicate 过滤条件
   * @param childrenKey 子节点字段名
   */
  static filterTree<T extends Record<string, any>>(
    tree: T[],
    predicate: (node: T) => boolean,
    childrenKey = 'children',
  ): T[] {
    const result: T[] = [];

    tree.forEach((node) => {
      if (predicate(node)) {
        const children = node[childrenKey];
        const filteredNode = { ...node } as any;

        if (children && Array.isArray(children) && children.length > 0) {
          const filteredChildren = this.filterTree(children, predicate, childrenKey);
          if (filteredChildren.length > 0) {
            filteredNode[childrenKey] = filteredChildren;
          }
        }

        result.push(filteredNode);
      }
    });

    return result;
  }

  /**
   * 遍历树
   * @param tree 树形数据
   * @param callback 回调函数
   * @param childrenKey 子节点字段名
   */
  static traverse<T extends Record<string, any>>(
    tree: T[],
    callback: (node: T, level: number, parent: T | null) => void,
    childrenKey = 'children',
  ): void {
    const walk = (nodes: T[], level: number, parent: T | null = null) => {
      nodes.forEach((node) => {
        callback(node, level, parent);

        const children = node[childrenKey];
        if (children && Array.isArray(children) && children.length > 0) {
          walk(children, level + 1, node);
        }
      });
    };

    walk(tree, 0);
  }

  /**
   * 树映射转换
   * @param tree 树形数据
   * @param mapper 映射函数
   * @param childrenKey 子节点字段名
   */
  static mapTree<T extends Record<string, any>, R>(
    tree: T[],
    mapper: (node: T) => R,
    childrenKey = 'children',
  ): R[] {
    return tree.map((node) => {
      const mapped = mapper(node);
      const children = node[childrenKey];

      if (children && Array.isArray(children) && children.length > 0) {
        (mapped as any)[childrenKey] = this.mapTree(children, mapper, childrenKey);
      }

      return mapped;
    });
  }

  /**
   * 获取树的最大深度
   */
  static getMaxDepth<T extends Record<string, any>>(tree: T[], childrenKey = 'children'): number {
    if (!tree || tree.length === 0) return 0;

    let maxDepth = 1;

    tree.forEach((node) => {
      const children = node[childrenKey];
      if (children && Array.isArray(children) && children.length > 0) {
        const depth = 1 + this.getMaxDepth(children, childrenKey);
        maxDepth = Math.max(maxDepth, depth);
      }
    });

    return maxDepth;
  }

  /**
   * 获取所有叶子节点
   */
  static getLeafNodes<T extends Record<string, any>>(tree: T[], childrenKey = 'children'): T[] {
    const leaves: T[] = [];

    this.traverse(
      tree,
      (node) => {
        const children = node[childrenKey];
        if (!children || !Array.isArray(children) || children.length === 0) {
          leaves.push(node);
        }
      },
      childrenKey,
    );

    return leaves;
  }

  /**
   * 排序树节点
   */
  static sortTree<T extends Record<string, any>>(
    tree: T[],
    compareFn: (a: T, b: T) => number,
    childrenKey = 'children',
  ): T[] {
    const sorted = [...tree].sort(compareFn);

    return sorted.map((node) => {
      const children = node[childrenKey];
      if (children && Array.isArray(children) && children.length > 0) {
        return {
          ...node,
          [childrenKey]: this.sortTree(children, compareFn, childrenKey),
        };
      }
      return node;
    });
  }

  /**
   * 添加层级信息
   */
  static addLevelInfo<T extends Record<string, any>>(
    tree: T[],
    childrenKey = 'children',
    levelKey = 'level',
  ): T[] {
    const addLevel = (nodes: T[], level: number): T[] => {
      return nodes.map((node) => {
        const newNode = { ...node, [levelKey]: level } as any;
        const children = node[childrenKey];

        if (children && Array.isArray(children) && children.length > 0) {
          newNode[childrenKey] = addLevel(children, level + 1);
        }

        return newNode;
      });
    };

    return addLevel(tree, 1);
  }
}
