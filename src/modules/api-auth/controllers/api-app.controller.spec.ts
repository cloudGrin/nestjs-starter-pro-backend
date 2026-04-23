import 'reflect-metadata';
import { ApiAppController } from './api-app.controller';
import { UpdateApiAppDto } from '../dto/update-api-app.dto';

describe('ApiAppController', () => {
  it('uses UpdateApiAppDto for API app updates', () => {
    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      ApiAppController.prototype,
      'updateApp',
    );

    expect(paramTypes[1]).toBe(UpdateApiAppDto);
  });
});
