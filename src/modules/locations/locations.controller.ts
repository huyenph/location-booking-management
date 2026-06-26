import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { Location } from "./entities/location.entity";
import { LocationsService } from "./locations.service";

@ApiTags("locations")
@Controller("locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a location node (parentId required unless root Building).",
  })
  @ApiCreatedResponse({ type: Location })
  create(@Body() dto: CreateLocationDto): Promise<Location> {
    return this.locationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get the full location tree (nested JSON)." })
  @ApiOkResponse({ type: Location, isArray: true })
  findTree(): Promise<Location[]> {
    return this.locationsService.findTree();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one location, optionally with its subtree." })
  @ApiQuery({
    name: "subtree",
    required: false,
    type: Boolean,
    description: "If true, include the full descendant subtree.",
  })
  @ApiOkResponse({ type: Location })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("subtree", new ParseBoolPipe({ optional: true })) subtree?: boolean,
  ): Promise<Location> {
    return subtree
      ? this.locationsService.findOneWithSubtree(id)
      : this.locationsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update location attributes." })
  @ApiOkResponse({ type: Location })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<Location> {
    return this.locationsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Delete a location. Blocked (409) if it has children or active bookings.",
  })
  @ApiNoContentResponse()
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.locationsService.remove(id);
  }
}
