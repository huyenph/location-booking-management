import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameColumnEntities1782449307137 implements MigrationInterface {
    name = 'RenameColumnEntities1782449307137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "building" character varying(100) NOT NULL, "name" character varying(255) NOT NULL, "location_number" character varying(100) NOT NULL, "department" character varying(100), "capacity" integer, "open_time" jsonb, "is_bookable" boolean NOT NULL DEFAULT false, "parent_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "parentId" uuid, CONSTRAINT "UQ_83b86682bf54686b88a1a1ed039" UNIQUE ("location_number"), CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_location_location_number" ON "locations" ("location_number") `);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "location_id" uuid NOT NULL, "department" character varying(100) NOT NULL, "attendees" integer NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'CONFIRMED', "rejection_reason" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_booking_location_time" ON "bookings" ("location_id", "start_time", "end_time") `);
        await queryRunner.query(`CREATE TABLE "locations_closure" ("id_ancestor" uuid NOT NULL, "id_descendant" uuid NOT NULL, CONSTRAINT "PK_3f1bafc17fe413b1fe0802b21a1" PRIMARY KEY ("id_ancestor", "id_descendant"))`);
        await queryRunner.query(`CREATE INDEX "IDX_894191385ed43cd444dfb6ddba" ON "locations_closure" ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_a95443d1f462adb513b9f79b91" ON "locations_closure" ("id_descendant") `);
        await queryRunner.query(`ALTER TABLE "locations" ADD CONSTRAINT "FK_9f238930bae84c7eafad3785d7b" FOREIGN KEY ("parentId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_98b16ca585a7ef5bca03badcdec" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "locations_closure" ADD CONSTRAINT "FK_894191385ed43cd444dfb6ddba2" FOREIGN KEY ("id_ancestor") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "locations_closure" ADD CONSTRAINT "FK_a95443d1f462adb513b9f79b916" FOREIGN KEY ("id_descendant") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "locations_closure" DROP CONSTRAINT "FK_a95443d1f462adb513b9f79b916"`);
        await queryRunner.query(`ALTER TABLE "locations_closure" DROP CONSTRAINT "FK_894191385ed43cd444dfb6ddba2"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_98b16ca585a7ef5bca03badcdec"`);
        await queryRunner.query(`ALTER TABLE "locations" DROP CONSTRAINT "FK_9f238930bae84c7eafad3785d7b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a95443d1f462adb513b9f79b91"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_894191385ed43cd444dfb6ddba"`);
        await queryRunner.query(`DROP TABLE "locations_closure"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_booking_location_time"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_location_location_number"`);
        await queryRunner.query(`DROP TABLE "locations"`);
    }

}
