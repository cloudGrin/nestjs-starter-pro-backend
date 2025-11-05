import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { MenuEntity } from '../entities/menu.entity';
import { QueryMenuDto } from '../dto/query-menu.dto';

@Injectable()
export class MenuRepository extends BaseRepository<MenuEntity> {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepo: Repository<MenuEntity>,
  ) {
    super(menuRepo);
  }

  /**
   * 查询菜单（筛选）
   */
  async findWithQuery(query: QueryMenuDto): Promise<MenuEntity[]> {
    const qb = this.menuRepo.createQueryBuilder('menu');

    // 筛选条件
    if (query.name) {
      qb.andWhere('menu.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.type) {
      qb.andWhere('menu.type = :type', { type: query.type });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('menu.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.isVisible !== undefined) {
      qb.andWhere('menu.isVisible = :isVisible', {
        isVisible: query.isVisible,
      });
    }

    // 排序 (MySQL不支持NULLS FIRST语法，但NULL值默认排在前面)
    qb.orderBy('menu.parentId', 'ASC')
      .addOrderBy('menu.sort', 'ASC')
      .addOrderBy('menu.createdAt', 'ASC');

    return qb.getMany();
  }

  /**
   * 查找顶级菜单
   */
  async findRootMenus(): Promise<MenuEntity[]> {
    return this.menuRepo.find({
      where: { parentId: IsNull(), isActive: true },
      order: { sort: 'ASC' },
    });
  }

  /**
   * 查找子菜单
   */
  async findByParentId(parentId: number): Promise<MenuEntity[]> {
    return this.menuRepo.find({
      where: { parentId, isActive: true },
      order: { sort: 'ASC' },
    });
  }

  /**
   * 查找菜单及其子菜单
   */
  async findWithChildren(id: number): Promise<MenuEntity | null> {
    return this.menuRepo.findOne({
      where: { id },
      relations: ['children'],
    });
  }
}
