import dataSource from "../config/database/data-source";
import { Location } from "../modules/locations/entities/location.entity";
import {
  DayOfWeek,
  OpenTime,
} from "../modules/locations/entities/open-time.interface";

interface NodeSpec {
  building: string;
  name: string;
  locationNumber: string;
  department?: string;
  capacity?: number;
  openTime?: OpenTime;
  isBookable?: boolean;
  children?: NodeSpec[];
}

const WEEKDAYS_9_18: OpenTime = {
  days: [
    DayOfWeek.MON,
    DayOfWeek.TUE,
    DayOfWeek.WED,
    DayOfWeek.THU,
    DayOfWeek.FRI,
  ],
  startTime: "09:00",
  endTime: "18:00",
};

const WEEKDAYS_8_17: OpenTime = {
  days: [
    DayOfWeek.MON,
    DayOfWeek.TUE,
    DayOfWeek.WED,
    DayOfWeek.THU,
    DayOfWeek.FRI,
  ],
  startTime: "08:00",
  endTime: "17:00",
};

const MON_SAT_9_20: OpenTime = {
  days: [
    DayOfWeek.MON,
    DayOfWeek.TUE,
    DayOfWeek.WED,
    DayOfWeek.THU,
    DayOfWeek.FRI,
    DayOfWeek.SAT,
  ],
  startTime: "09:00",
  endTime: "20:00",
};

const TREE: NodeSpec[] = [
  {
    building: "A",
    name: "Building A",
    locationNumber: "A",
    children: [
      {
        building: "A",
        name: "Floor 1",
        locationNumber: "A-01",
        children: [
          { building: "A", name: "Lobby", locationNumber: "A-01-00" },
          {
            building: "A",
            name: "Meeting Room 1",
            locationNumber: "A-01-01",
            department: "EFM",
            capacity: 8,
            openTime: WEEKDAYS_9_18,
            isBookable: true,
          },
          {
            building: "A",
            name: "Meeting Room 2",
            locationNumber: "A-01-02",
            department: "EFM",
            capacity: 4,
            openTime: WEEKDAYS_9_18,
            isBookable: true,
          },
        ],
      },
      {
        building: "A",
        name: "Floor 2",
        locationNumber: "A-02",
        children: [
          { building: "A", name: "Corridor", locationNumber: "A-02-00" },
          {
            building: "A",
            name: "Room 201",
            locationNumber: "A-02-01",
            department: "HR",
            capacity: 10,
            openTime: WEEKDAYS_8_17,
            isBookable: true,
            children: [
              {
                building: "A",
                name: "Room 201 - Phone Booth",
                locationNumber: "A-02-01-01",
                department: "HR",
                capacity: 2,
                openTime: WEEKDAYS_8_17,
                isBookable: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    building: "B",
    name: "Building B",
    locationNumber: "B",
    children: [
      {
        building: "B",
        name: "Floor 1",
        locationNumber: "B-01",
        children: [
          {
            building: "B",
            name: "Conference Hall",
            locationNumber: "B-01-01",
            department: "SALES",
            capacity: 50,
            openTime: MON_SAT_9_20,
            isBookable: true,
          },
          {
            building: "B",
            name: "IT War Room",
            locationNumber: "B-01-02",
            department: "IT",
            capacity: 6,
            openTime: WEEKDAYS_9_18,
            isBookable: true,
          },
        ],
      },
    ],
  },
];

async function upsertNode(
  spec: NodeSpec,
  parent: Location | null,
): Promise<Location> {
  const repo = dataSource.getTreeRepository(Location);
  let node = await repo.findOne({
    where: { locationNumber: spec.locationNumber },
  });

  if (!node) {
    node = repo.create({
      building: spec.building,
      name: spec.name,
      locationNumber: spec.locationNumber,
      department: spec.department ?? null,
      capacity: spec.capacity ?? null,
      openTime: spec.openTime ?? null,
      isBookable: spec.isBookable ?? false,
      parent: parent ?? null,
      parentId: parent?.id ?? null,
    });
    node = await repo.save(node);

    console.log(`  + created ${spec.locationNumber} (${spec.name})`);
  } else {
    console.log(`  = exists  ${spec.locationNumber} (${spec.name})`);
  }

  for (const child of spec.children ?? []) {
    await upsertNode(child, node);
  }
  return node;
}

async function run(): Promise<void> {
  await dataSource.initialize();

  console.log("Seeding location tree (idempotent by locationNumber)...");
  try {
    for (const root of TREE) {
      await upsertNode(root, null);
    }

    console.log("Seed complete.");
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
