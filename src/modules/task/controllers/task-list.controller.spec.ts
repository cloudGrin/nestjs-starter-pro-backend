import 'reflect-metadata';
import { PERMISSIONS_KEY } from '~/core/decorators/require-permissions.decorator';
import { TaskListController } from './task-list.controller';

describe('TaskListController', () => {
  it('keeps list reads on task read permission only', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TaskListController.prototype.findLists,
    );

    expect(permissions).toEqual(['task:read']);
  });

  it('requires task list manage permission to initialize defaults', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TaskListController.prototype.ensureDefaultLists,
    );

    expect(permissions).toEqual(['task-list:manage']);
  });
});
