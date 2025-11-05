import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          ...dbConfig,
          autoLoadEntities: true,
          logging: dbConfig.logging ? ['query', 'error'] : false,
          logger: dbConfig.logging ? 'advanced-console' : undefined,
          extra: {
            connectionLimit: 10,
          },
        } as DataSourceOptions;
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('Database configuration is missing');
        }
        const dataSource = await new DataSource(options).initialize();
        return dataSource;
      },
    }),
  ],
})
export class DatabaseModule {}
