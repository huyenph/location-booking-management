import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import configuration from "./config/configuration";
import { Booking } from "./modules/bookings/entities/booking.entity";
import { Location } from "./modules/locations/entities/location.entity";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { LocationsModule } from "./modules/locations/locations.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("database.host"),
        port: config.get<number>("database.port"),
        username: config.get<string>("database.username"),
        password: config.get<string>("database.password"),
        database: config.get<string>("database.name"),
        entities: [Location, Booking],
        synchronize: false,
        autoLoadEntities: true,
        logging: ["error"],
      }),
    }),
    LocationsModule,
    BookingsModule,
  ],
})
export class AppModule {}
