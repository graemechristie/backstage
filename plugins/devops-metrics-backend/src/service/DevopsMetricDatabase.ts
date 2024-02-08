/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  PluginDatabaseManager,
  resolvePackagePath,
} from '@backstage/backend-common';
import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

// These are just placeholders for now .. I have not defined what our schema/objects look like yet
export type RawDevopsEventRow = {
  id: string;
  timestamp: number;
  event: string;
};

// These are just placeholders for now .. I have not defined what our schema/objects look like yet
export type DevopsEvent = {
  id?: string;
  event: object;
  timestamp: number;
};

// These are just placeholders for now .. I have not defined what our schema/objects look like yet
export interface DevopsMetricStore {
  insertEvent(devopsEvent: DevopsEvent): Promise<{ eventId: string }>;
  getEvents(fromTimeStamp?: number): Promise<DevopsEvent[]>;
  getEvent(eventId: string): Promise<DevopsEvent | undefined>;
}

const migrationsDir = resolvePackagePath(
  '@backstage/plugin-devops-metrics-backend',
  'migrations',
);

export class DevopsMetricDatabase implements DevopsMetricStore {
  static async create(
    database: PluginDatabaseManager,
  ): Promise<DevopsMetricStore> {
    const knex = await database.getClient();

    if (!database.migrations?.skip) {
      await knex.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new DevopsMetricDatabase(knex);
  }

  constructor(private readonly db: Knex) {}

  async insertEvent(devopsEvent: DevopsEvent): Promise<{ eventId: string }> {
    const eventId: string = uuid();

    await this.db<RawDevopsEventRow>('devops_events').insert({
      id: eventId,
      event: JSON.stringify(devopsEvent.event),
      timestamp: devopsEvent.timestamp,
    });

    return { eventId };
  }

  async getEvents(fromTimeStamp?: number): Promise<DevopsEvent[]> {
    const results = await this.db<RawDevopsEventRow>('devops_events')
      .orderBy('timestamp', 'desc')
      .modify(function (queryBuilder) {
        if (fromTimeStamp !== undefined) {
          queryBuilder.where('timestamp', '>=', fromTimeStamp);
        }
      })
      .limit(100)
      .select<RawDevopsEventRow[]>();

    const devopsEvents: DevopsEvent[] = [];

    for (const rawEvent of results) {
      try {
        devopsEvents.push({
          id: rawEvent.id,
          event: JSON.parse(rawEvent.event),
          timestamp: rawEvent.timestamp,
        });
      } catch (error) {
        throw new Error(`Failed to serialize event '${rawEvent}', ${error}`);
      }
    }

    return devopsEvents;
  }

  async getEvent(eventId: string): Promise<DevopsEvent | undefined> {
    const rawEvent = await this.db<RawDevopsEventRow>('devops_events')
      .where('id', eventId)
      .select<RawDevopsEventRow[]>()
      .first();

    if (rawEvent === undefined) return undefined;
    try {
      return {
        id: rawEvent.id,
        event: JSON.parse(rawEvent.event),
        timestamp: rawEvent.timestamp,
      };
    } catch (error) {
      throw new Error(`Failed to serialize event '${rawEvent}', ${error}`);
    }
  }
}
